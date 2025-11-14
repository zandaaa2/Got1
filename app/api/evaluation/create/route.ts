import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { sendEvaluationRequestEmail } from '@/lib/email'
import { getUserEmail, createAdminClient } from '@/lib/supabase-admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

/**
 * Creates a new evaluation request WITH upfront payment.
 * Player pays immediately, money held in escrow until scout confirms/denies.
 * If scout denies, automatic refund is issued.
 * 
 * @param request - Next.js request object containing scoutId and price
 * @returns Stripe checkout session ID or error response
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const body = await request.json()
    const { scoutId, price } = body

    if (!scoutId || !price) {
      return NextResponse.json(
        { error: 'Missing scoutId or price' },
        { status: 400 }
      )
    }

    // Prevent a user from requesting themselves (defensive check)
    if (scoutId === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot request an evaluation from yourself' },
        { status: 400 }
      )
    }

    // Get scout profile
    const { data: scout, error: scoutError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', scoutId)
      .maybeSingle()

    if (scoutError) {
      console.error('Error fetching scout:', scoutError)
      return NextResponse.json({ error: 'Failed to fetch scout' }, { status: 500 })
    }

    if (!scout || scout.role !== 'scout') {
      return NextResponse.json({ error: 'Invalid scout' }, { status: 400 })
    }

    // Get player profile
    const { data: player, error: playerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (playerError) {
      console.error('Error fetching player:', playerError)
      return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 })
    }

    if (!player || player.role !== 'player') {
      return NextResponse.json({ error: 'Invalid player' }, { status: 400 })
    }

    // Derive price server-side to protect against client tampering
    const scoutPrice = typeof scout.price_per_eval === 'number'
      ? scout.price_per_eval
      : parseFloat(String(scout.price_per_eval ?? price))

    if (!scoutPrice || Number.isNaN(scoutPrice)) {
      return NextResponse.json({ error: 'Scout price not configured' }, { status: 400 })
    }

    // Optional sanity check: block unrealistic or negative amounts
    if (scoutPrice <= 0 || scoutPrice > 10000) {
      console.warn('⚠️ Suspicious scout price detected', { scoutId, scoutPrice, playerId: player.user_id })
      return NextResponse.json({ error: 'Invalid scout price' }, { status: 400 })
    }

    // Detect tampering if client-supplied price doesn't match stored price (within $0.01)
    const clientPrice = typeof price === 'number' ? price : parseFloat(String(price))
    if (clientPrice && Math.abs(clientPrice - scoutPrice) > 0.01) {
      console.warn('⚠️ Price mismatch detected between client and server values', {
        scoutId,
        playerId: player.user_id,
        clientPrice,
        scoutPrice,
      })
      return NextResponse.json({ error: 'Invalid price provided' }, { status: 400 })
    }

    // Check if evaluation already exists in requested/confirmed/in_progress state
    const { data: existingEvaluation } = await supabase
      .from('evaluations')
      .select('id, status')
      .eq('scout_id', scout.user_id)
      .eq('player_id', player.user_id)
      .in('status', ['requested', 'confirmed', 'in_progress'])
      .maybeSingle()

    if (existingEvaluation) {
      return NextResponse.json(
        { 
          error: 'Evaluation already requested or in progress', 
          evaluationId: existingEvaluation.id,
          status: existingEvaluation.status
        },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Server not configured for payments' }, { status: 500 })
    }

    const { data: evaluation, error: evalError } = await adminSupabase
      .from('evaluations')
      .insert({
        scout_id: scout.user_id,
        player_id: player.user_id,
        status: 'requested',
        price: scoutPrice,
        payment_status: 'pending', // Will be updated to 'paid' by webhook
      })
      .select()
      .maybeSingle()

    if (evalError) {
      console.error('Error creating evaluation:', evalError)
      console.error('Error code:', evalError.code)
      console.error('Error message:', evalError.message)
      console.error('Error details:', JSON.stringify(evalError, null, 2))
      console.error('Scout user_id:', scout.user_id)
      console.error('Player user_id:', player.user_id)
      console.error('Price:', typeof price === 'string' ? parseFloat(price) : price)
      return NextResponse.json(
        { 
          error: 'Failed to create evaluation', 
          details: evalError.message,
          code: evalError.code,
          hint: evalError.hint || 'Check RLS policies for evaluations table'
        },
        { status: 500 }
      )
    }

    if (!evaluation) {
      return NextResponse.json(
        { error: 'Failed to create evaluation - no data returned' },
        { status: 500 }
      )
    }

    // Get player email for Stripe checkout
    const playerEmail = await getUserEmail(player.user_id)

    // Create Stripe Checkout Session for immediate payment
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: playerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Evaluation from ${scout.full_name || 'Scout'}`,
              description: `HUDL evaluation service`,
            },
            unit_amount: Math.round(scoutPrice * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/evaluations/${evaluation.id}?payment=success`,
      cancel_url: `${request.nextUrl.origin}/profile/${scoutId}`,
      metadata: {
        evaluation_id: evaluation.id,
        scout_id: scout.user_id,
        player_id: player.user_id,
        action: 'upfront_payment', // Flag to indicate upfront payment flow
      },
    })

    console.log('✅ Evaluation created successfully:', evaluation.id)
    console.log('✅ Stripe checkout session created:', checkoutSession.id)
    
    return successResponse({ 
      success: true, 
      evaluationId: evaluation.id,
      sessionId: checkoutSession.id
    })
  } catch (error: any) {
    console.error('Error creating evaluation:', error)
    return handleApiError(error, 'Internal server error')
  }
}

