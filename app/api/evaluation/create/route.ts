import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { getUserEmail } from '@/lib/supabase-admin'
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
    const { scoutId, price, playerId } = body

    // Check for scoutId and price (price can be 0 for free evaluations, so check for undefined/null explicitly)
    if (!scoutId || price === undefined || price === null) {
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

    // Get current user's profile to check if they're a parent
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (currentProfileError) {
      console.error('Error fetching current profile:', currentProfileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    if (!currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    // Determine player and purchaser info
    let player: any = null
    let purchasedBy: string | null = null
    let purchasedByType: 'player' | 'parent' | null = null

    if (currentProfile.role === 'parent') {
      // Parent is purchasing - use provided playerId or find their linked player
      if (playerId) {
        // Parent provided a specific player ID (from child selection)
        const { data: playerProfile, error: playerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', playerId)
          .maybeSingle()

        if (playerError) {
          console.error('Error fetching player:', playerError)
          return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 })
        }

        if (!playerProfile || playerProfile.role !== 'player') {
          return NextResponse.json({ error: 'Invalid player page' }, { status: 400 })
        }

        // Verify this player is linked to the parent
        const { data: parentLink } = await supabase
          .from('parent_children')
          .select('player_id')
          .eq('parent_id', session.user.id)
          .eq('player_id', playerProfile.user_id)
          .maybeSingle()

        if (!parentLink) {
          return NextResponse.json({ 
            error: 'This player is not linked to your account' 
          }, { status: 403 })
        }

        player = playerProfile
        purchasedBy = session.user.id
        purchasedByType = 'parent'
      } else {
        // No playerId provided - find their linked player (backward compatibility)
        const { data: parentLink, error: parentLinkError } = await supabase
          .from('parent_children')
          .select('player_id')
          .eq('parent_id', session.user.id)
          .maybeSingle()

        if (parentLinkError) {
          console.error('Error fetching parent link:', parentLinkError)
          return NextResponse.json({ error: 'Failed to fetch parent relationship' }, { status: 500 })
        }

        if (!parentLink) {
          return NextResponse.json({ 
            error: 'No linked player found. Please link a player page first.' 
          }, { status: 400 })
        }

        // Get the player profile
        const { data: playerProfile, error: playerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', parentLink.player_id)
          .maybeSingle()

        if (playerError) {
          console.error('Error fetching player:', playerError)
          return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 })
        }

        if (!playerProfile || playerProfile.role !== 'player') {
          return NextResponse.json({ error: 'Invalid player page' }, { status: 400 })
        }

        player = playerProfile
        purchasedBy = session.user.id
        purchasedByType = 'parent'
      }
    } else if (currentProfile.role === 'player') {
      // Player is purchasing for themselves
      player = currentProfile
      purchasedBy = session.user.id
      purchasedByType = 'player'
    } else {
      return NextResponse.json({ 
        error: 'Only players or parents can request evaluations' 
      }, { status: 400 })
    }

    // Handle free evals (price = 0) - check if scout has free eval offer enabled
    const clientPrice = typeof price === 'number' ? price : parseFloat(String(price))
    const isFreeEval = clientPrice === 0

    if (isFreeEval) {
      // For free evals, verify scout has free eval offer enabled
      if (!scout.free_eval_enabled) {
        return NextResponse.json(
          { error: 'This scout does not offer free evaluations' },
          { status: 400 }
        )
      }

      // Check if evaluation already exists
      const { data: existingEvaluation } = await supabase
        .from('evaluations')
        .select('id, status')
        .eq('scout_id', scout.user_id)
        .eq('player_id', player.user_id)
        .in('status', ['pending', 'confirmed', 'in_progress', 'completed'])
        .maybeSingle()

      if (existingEvaluation) {
        if (existingEvaluation.status === 'completed') {
          return NextResponse.json(
            { 
              error: 'Evaluation already completed',
              evaluationId: existingEvaluation.id
            },
            { status: 400 }
          )
        }
        return NextResponse.json(
          { 
            error: 'Evaluation already requested or in progress',
            evaluationId: existingEvaluation.id,
            status: existingEvaluation.status
          },
          { status: 400 }
        )
      }

      // Create free evaluation directly (no Stripe needed)
      const { data: evaluation, error: evalError } = await supabase
        .from('evaluations')
        .insert({
          scout_id: scout.user_id,
          player_id: player.user_id,
          status: 'in_progress',
          price: 0,
          payment_status: 'paid', // Free evals are considered "paid"
        })
        .select()
        .single()

      if (evalError || !evaluation) {
        console.error('Error creating free evaluation:', evalError)
        return handleApiError(evalError, 'Failed to create evaluation')
      }

      // Create notification for scout
      try {
        const { createNotification } = await import('@/lib/notifications')
        await createNotification({
          userId: scout.user_id,
          type: 'evaluation_requested',
          title: 'Free Evaluation Requested',
          message: `${player.full_name || 'A player'} requested your free evaluation offer.`,
          link: `/evaluations/${evaluation.id}`,
          metadata: {
            evaluation_id: evaluation.id,
            player_id: player.user_id,
          },
        })
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError)
        // Don't fail the request if notification fails
      }

      return successResponse({ 
        success: true,
        evaluationId: evaluation.id,
        isFree: true
      })
    }

    // For paid evals, continue with existing flow
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
    // This prevents duplicate requests even if user tries to pay multiple times
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

    // DO NOT create evaluation here - evaluation will be created in webhook after payment succeeds
    // This ensures evaluation is only created if payment is successful
    
    // Get player email for Stripe checkout
    const playerEmail = await getUserEmail(player.user_id)

    // Create Stripe Checkout Session with evaluation data in metadata
    // Evaluation will be created in webhook when payment succeeds
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
      success_url: `${request.nextUrl.origin}/evaluations/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/profile/${scoutId}`,
      metadata: {
        // Store all evaluation data in metadata - evaluation will be created in webhook
        scout_id: scout.user_id,
        player_id: player.user_id,
        price: scoutPrice.toString(),
        scout_profile_id: scout.id, // Store profile ID for redirect
        action: 'upfront_payment', // Flag to indicate upfront payment flow
        purchased_by: purchasedBy || player.user_id, // Who is purchasing (parent or player)
        purchased_by_type: purchasedByType || 'player', // Type of purchaser
      },
    })

    // CRITICAL: Verify metadata was actually saved by Stripe
    const verifiedSession = await stripe.checkout.sessions.retrieve(checkoutSession.id)
    if (!verifiedSession.metadata || 
        !verifiedSession.metadata.scout_id || 
        !verifiedSession.metadata.player_id ||
        !verifiedSession.metadata.action) {
      console.error('❌ CRITICAL: Checkout session created without required metadata!', {
        sessionId: checkoutSession.id,
        metadata: verifiedSession.metadata,
        expected: {
          scout_id: scout.user_id,
          player_id: player.user_id,
          action: 'upfront_payment',
          purchased_by: purchasedBy || player.user_id,
          purchased_by_type: purchasedByType || 'player',
        },
      })
      // Fail the request - don't let user proceed without metadata
      return NextResponse.json({ 
        error: 'Failed to create checkout session with required metadata. Please try again.',
      }, { status: 500 })
    }

    console.log('✅ Checkout session created with metadata:', {
      sessionId: checkoutSession.id,
      metadata: verifiedSession.metadata,
    })

    return successResponse({ 
      success: true, 
      sessionId: checkoutSession.id
    })
  } catch (error: any) {
    console.error('Error creating evaluation:', error)
    return handleApiError(error, 'Internal server error')
  }
}

