import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

/**
 * Debug endpoint to manually test webhook evaluation creation.
 * Usage: POST /api/debug/test-webhook with body: { session_id: "xxx" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id } = body

    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    console.log('🧪 Testing webhook evaluation creation for session:', session_id)

    // Retrieve Stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id)
    
    console.log('📦 Stripe session:', {
      id: session.id,
      payment_status: session.payment_status,
      metadata: session.metadata,
      payment_intent: session.payment_intent,
    })

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ 
        error: 'Payment not completed',
        payment_status: session.payment_status,
      }, { status: 400 })
    }

    const scoutId = session.metadata?.scout_id
    const playerId = session.metadata?.player_id
    const priceStr = session.metadata?.price
    const action = session.metadata?.action

    console.log('🔍 Metadata:', { scoutId, playerId, price: priceStr, action })

    if (!scoutId || !playerId || !priceStr) {
      return NextResponse.json({ 
        error: 'Missing required metadata',
        metadata: session.metadata,
      }, { status: 400 })
    }

    // Check if evaluation already exists
    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Admin client not available' }, { status: 500 })
    }

    const price = parseFloat(priceStr)
    const platformFee = Math.round(price * 0.1 * 100) / 100
    const scoutPayout = Math.round(price * 0.9 * 100) / 100

    // IDEMPOTENCY CHECK: First check by payment_intent_id (most reliable - unique per payment)
    // This matches the webhook's idempotency logic
    const paymentIntentId = session.payment_intent as string
    let existing = null

    if (paymentIntentId) {
      const { data: existingByPaymentIntent } = await adminSupabase
        .from('evaluations')
        .select('*')
        .eq('payment_intent_id', paymentIntentId)
        .maybeSingle()

      if (existingByPaymentIntent) {
        console.log('✅ Evaluation already exists for this payment_intent_id:', existingByPaymentIntent.id)
        existing = existingByPaymentIntent
      }
    }

    // If not found by payment_intent, check by scout+player (backup check)
    if (!existing) {
      const { data: existingByScoutPlayer } = await adminSupabase
        .from('evaluations')
        .select('*')
        .eq('scout_id', scoutId)
        .eq('player_id', playerId)
        .in('status', ['requested', 'confirmed', 'in_progress'])
        .maybeSingle()

      if (existingByScoutPlayer) {
        console.log('⚠️ Evaluation already exists (by scout+player), updating payment_intent_id:', existingByScoutPlayer.id)
        // Update existing evaluation with payment_intent_id if missing
        await adminSupabase
          .from('evaluations')
          .update({ payment_intent_id: paymentIntentId })
          .eq('id', existingByScoutPlayer.id)
        
        existing = existingByScoutPlayer
      }
    }

    if (existing) {
      return NextResponse.json({
        message: 'Evaluation already exists',
        evaluation: existing,
        action: 'found_existing',
      })
    }

    // Create evaluation (same logic as webhook)
    const { data: newEvaluation, error: createError } = await adminSupabase
      .from('evaluations')
      .insert({
        scout_id: scoutId,
        player_id: playerId,
        status: 'requested',
        price: price,
        payment_status: 'paid',
        payment_intent_id: session.payment_intent as string,
        platform_fee: platformFee,
        scout_payout: scoutPayout,
      })
      .select()
      .single()

    if (createError || !newEvaluation) {
      console.error('❌ Failed to create evaluation:', createError)
      return NextResponse.json({
        error: 'Failed to create evaluation',
        details: createError?.message,
        code: createError?.code,
        hint: createError?.hint,
      }, { status: 500 })
    }

    console.log('✅ Evaluation created:', newEvaluation.id)

    // Create notifications (same as webhook does)
    try {
      // Get player profile for notification
      const { data: playerProfile } = await adminSupabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', playerId)
        .maybeSingle()

      // Create notification for scout
      const scoutNotification = await createNotification({
        userId: scoutId,
        type: 'evaluation_requested',
        title: 'New Evaluation Request',
        message: `${playerProfile?.full_name || 'A player'} has requested an evaluation from you.`,
        link: `/evaluations/${newEvaluation.id}`,
        metadata: {
          evaluation_id: newEvaluation.id,
          player_id: playerId,
          price: newEvaluation.price,
          action: 'upfront_payment',
        },
      })

      if (scoutNotification) {
        console.log('✅ Scout notification created:', scoutId)
      } else {
        console.error('❌ Failed to create scout notification')
      }

      // Create notification for player
      const playerNotification = await createNotification({
        userId: playerId,
        type: 'payment_received',
        title: 'Payment Received',
        message: `Your payment of $${newEvaluation.price.toFixed(2)} for the evaluation has been processed successfully.`,
        link: `/evaluations/${newEvaluation.id}`,
        metadata: {
          evaluation_id: newEvaluation.id,
          amount: newEvaluation.price,
          payment_intent_id: session.payment_intent as string || null,
        },
      })

      if (playerNotification) {
        console.log('✅ Player notification created:', playerId)
      } else {
        console.error('❌ Failed to create player notification')
      }
    } catch (notificationError) {
      console.error('❌ Error creating notifications:', notificationError)
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({
      success: true,
      message: 'Evaluation created successfully',
      evaluation: newEvaluation,
      action: 'created',
    })
  } catch (error: any) {
    console.error('Error in test webhook:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

