import { createRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient(() => cookieStore)
    
    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { scoutId, price } = body

    if (!scoutId || !price) {
      return NextResponse.json(
        { error: 'Missing scoutId or price' },
        { status: 400 }
      )
    }

    // Get scout profile
    const { data: scout } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', scoutId)
      .single()

    if (!scout || scout.role !== 'scout') {
      return NextResponse.json({ error: 'Invalid scout' }, { status: 400 })
    }

    // Get player profile
    const { data: player } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (!player || player.role !== 'player') {
      return NextResponse.json({ error: 'Invalid player' }, { status: 400 })
    }

    // Check for existing pending evaluation
    const { data: existingEvaluation } = await supabase
      .from('evaluations')
      .select('id')
      .eq('scout_id', scout.user_id)
      .eq('player_id', player.user_id)
      .in('status', ['pending', 'in_progress'])
      .maybeSingle()

    if (existingEvaluation) {
      return NextResponse.json(
        { 
          error: 'You already have a pending evaluation with this scout',
          evaluationId: existingEvaluation.id 
        },
        { status: 400 }
      )
    }

    // Create evaluation record (pending payment)
    const { data: evaluation, error: evalError } = await supabase
      .from('evaluations')
      .insert({
        scout_id: scout.user_id,
        player_id: player.user_id,
        status: 'pending',
        price: price,
      })
      .select()
      .single()

    if (evalError || !evaluation) {
      console.error('Error creating evaluation:', evalError)
      return NextResponse.json(
        { error: 'Failed to create evaluation', details: evalError?.message },
        { status: 500 }
      )
    }

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Evaluation from ${scout.full_name || 'Scout'}`,
              description: `Football player evaluation service`,
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/evaluations/${evaluation.id}/purchase-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/profile/${scoutId}/purchase`,
      metadata: {
        evaluation_id: evaluation.id,
        scout_id: scout.user_id,
        player_id: player.user_id,
      },
    })

    return NextResponse.json({ sessionId: checkoutSession.id })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

