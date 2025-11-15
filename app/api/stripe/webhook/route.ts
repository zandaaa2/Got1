import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export const runtime = 'nodejs'

// Next.js will by default parse the body, which we don't want for webhooks
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  console.log('🔐 Attempting to verify with secret prefix:', webhookSecret?.slice(0, 8))

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error(`Webhook signature verification failed:`, err.message)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  console.log('🔐 Webhook secret prefix after verification:', process.env.STRIPE_WEBHOOK_SECRET?.slice(0, 8))

  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    console.error('Admin Supabase client not configured. Check service role key.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Verify payment was successful
      if (session.payment_status !== 'paid') {
        console.warn(`Payment not completed for session ${session.id}. Status: ${session.payment_status}`)
        return NextResponse.json({ received: true, warning: 'Payment not completed' })
      }

      const scoutId = session.metadata?.scout_id
      const playerId = session.metadata?.player_id
      const priceStr = session.metadata?.price
      const action = session.metadata?.action // 'upfront_payment' or 'scout_confirmed'
      const evaluationId = session.metadata?.evaluation_id // For old flow (scout_confirmed)

      console.log('🔍 Webhook received checkout.session.completed:', {
        session_id: session.id,
        scout_id: scoutId,
        player_id: playerId,
        price: priceStr,
        action,
        evaluation_id: evaluationId, // May be null for upfront_payment flow
        metadata: session.metadata,
        payment_status: session.payment_status,
      })

      // For upfront_payment flow, create evaluation here
      // For scout_confirmed flow, evaluation_id should exist and we update it
      let evaluation

      if (action === 'upfront_payment') {
        // NEW FLOW: Create evaluation when payment succeeds
        if (!scoutId || !playerId || !priceStr) {
          console.error('❌ Missing required metadata for upfront_payment:', {
            scout_id: scoutId,
            player_id: playerId,
            price: priceStr,
            metadata: session.metadata,
          })
          return NextResponse.json({ error: 'Missing required metadata' }, { status: 400 })
        }

        const price = parseFloat(priceStr)
        if (isNaN(price) || price <= 0) {
          console.error('❌ Invalid price in metadata:', priceStr)
          return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
        }

        // IDEMPOTENCY CHECK: First check by payment_intent_id (most reliable - unique per payment)
        // This prevents duplicate evaluations if webhook fires multiple times
        const paymentIntentId = session.payment_intent as string
        evaluation = null

        if (paymentIntentId) {
          const { data: existingByPaymentIntent } = await adminSupabase
            .from('evaluations')
            .select('id, status, payment_status, scout_id, player_id')
            .eq('payment_intent_id', paymentIntentId)
            .maybeSingle()

          if (existingByPaymentIntent) {
            console.log('✅ Evaluation already exists for this payment_intent_id, using existing:', existingByPaymentIntent.id)
            const { data: existingEval } = await adminSupabase
              .from('evaluations')
              .select('*')
              .eq('id', existingByPaymentIntent.id)
              .single()
            evaluation = existingEval
          }
        }

        // If not found by payment_intent, check by scout+player (backup check)
        if (!evaluation) {
          const { data: existingByScoutPlayer } = await adminSupabase
            .from('evaluations')
            .select('id, status, payment_status')
            .eq('scout_id', scoutId)
            .eq('player_id', playerId)
            .in('status', ['requested', 'confirmed', 'in_progress'])
            .maybeSingle()

          if (existingByScoutPlayer) {
            console.warn('⚠️ Evaluation already exists (by scout+player), updating payment_intent_id:', existingByScoutPlayer.id)
            // Update existing evaluation with payment_intent_id if missing
            await adminSupabase
              .from('evaluations')
              .update({ payment_intent_id: paymentIntentId })
              .eq('id', existingByScoutPlayer.id)
            
            const { data: existingEval } = await adminSupabase
              .from('evaluations')
              .select('*')
              .eq('id', existingByScoutPlayer.id)
              .single()
            evaluation = existingEval
          }
        }

        // Only create if doesn't exist
        if (!evaluation) {
          // CREATE evaluation for the first time - payment has succeeded
          const platformFee = Math.round(price * 0.1 * 100) / 100
          const scoutPayout = Math.round(price * 0.9 * 100) / 100

          console.log('📝 Creating evaluation after successful payment...', {
            scout_id: scoutId,
            player_id: playerId,
            price,
          })

          const { data: newEvaluation, error: createError } = await adminSupabase
            .from('evaluations')
            .insert({
              scout_id: scoutId,
              player_id: playerId,
              status: 'requested', // Waiting for scout to confirm/deny
              price: price,
              payment_status: 'paid', // Payment already succeeded
              payment_intent_id: session.payment_intent as string,
              platform_fee: platformFee,
              scout_payout: scoutPayout,
            })
            .select()
            .single()

          if (createError || !newEvaluation) {
            console.error('❌ Failed to create evaluation after payment:', createError)
            console.error('❌ Create error details:', JSON.stringify(createError, null, 2))
            console.error('❌ Insert data:', {
              scout_id: scoutId,
              player_id: playerId,
              status: 'requested',
              price,
              payment_status: 'paid',
              payment_intent_id: session.payment_intent as string,
              platform_fee: platformFee,
              scout_payout: scoutPayout,
            })
            return NextResponse.json({ 
              error: 'Failed to create evaluation',
              details: createError?.message || 'Unknown error',
              code: createError?.code,
            }, { status: 500 })
          }

          evaluation = newEvaluation
          console.log('✅ Evaluation created successfully after payment:', {
            id: evaluation.id,
            scout_id: evaluation.scout_id,
            player_id: evaluation.player_id,
            status: evaluation.status,
            payment_status: evaluation.payment_status,
            price: evaluation.price,
            payment_intent_id: evaluation.payment_intent_id,
          })
        }
      } else if (action === 'scout_confirmed' && evaluationId) {
        // OLD FLOW: Update existing evaluation (for scout_confirmed flow)
        const { data: existingEvaluation, error: evaluationError } = await adminSupabase
          .from('evaluations')
          .select('*')
          .eq('id', evaluationId)
          .maybeSingle()

        if (evaluationError) {
          console.error('❌ Error fetching evaluation:', evaluationError)
          return NextResponse.json({ error: 'Failed to fetch evaluation' }, { status: 500 })
        }

        if (!existingEvaluation) {
          console.error('❌ Evaluation not found:', evaluationId)
          return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
        }

        evaluation = existingEvaluation

        // Calculate fees (10% platform, 90% scout)
        const platformFee = Math.round(evaluation.price * 0.1 * 100) / 100
        const scoutPayout = Math.round(evaluation.price * 0.9 * 100) / 100

        // Update evaluation with payment info
        const updateData: any = {
          payment_status: 'paid',
          payment_intent_id: session.payment_intent as string,
          platform_fee: platformFee,
          scout_payout: scoutPayout,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        }

        const { error: updateError } = await adminSupabase
          .from('evaluations')
          .update(updateData)
          .eq('id', evaluationId)

        if (updateError) {
          console.error('Error updating evaluation:', updateError)
          return NextResponse.json({ error: 'Failed to update evaluation' }, { status: 500 })
        }
      } else {
        console.error('❌ Invalid action or missing required data:', { action, evaluationId, scoutId, playerId })
        return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 })
      }

      // Safety check: evaluation should always be set by now
      if (!evaluation) {
        console.error('❌ CRITICAL: Evaluation is undefined after processing webhook')
        return NextResponse.json({ error: 'Failed to process evaluation' }, { status: 500 })
      }

      console.log('✅ Evaluation processed:', {
        id: evaluation.id,
        status: evaluation.status,
        payment_status: evaluation.payment_status || 'paid',
        scout_id: evaluation.scout_id,
        player_id: evaluation.player_id,
        created_at: evaluation.created_at,
      })

      // Verify the evaluation can be read back (check RLS/access)
      const { data: verifyEval, error: verifyError } = await adminSupabase
        .from('evaluations')
        .select('id, status, payment_status')
        .eq('id', evaluation.id)
        .single()
      
      if (verifyError || !verifyEval) {
        console.error('⚠️ WARNING: Created evaluation cannot be read back:', verifyError)
        console.error('⚠️ This might indicate an RLS issue or database constraint problem')
      } else {
        console.log('✅ Verification: Evaluation can be read back:', verifyEval)
      }

      // Send email notification to scout for upfront payment
      if (action === 'upfront_payment') {
        try {
          const { sendEvaluationRequestEmail } = await import('@/lib/email')
          const { getUserEmail } = await import('@/lib/supabase-admin')
          
          const scoutEmail = await getUserEmail(evaluation.scout_id)
          
          if (scoutEmail) {
            // Get profile names
            const { data: scoutProfile } = await adminSupabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', evaluation.scout_id)
              .maybeSingle()
            
            const { data: playerProfile } = await adminSupabase
              .from('profiles')
              .select('full_name, school')
              .eq('user_id', evaluation.player_id)
              .maybeSingle()
            
            await sendEvaluationRequestEmail(
              scoutEmail,
              scoutProfile?.full_name || 'Scout',
              playerProfile?.full_name || 'Player',
              playerProfile?.school || null,
              evaluation.id,
              evaluation.price
            )
          }
        } catch (emailError) {
          console.error('Error sending email notification:', emailError)
          // Don't fail the webhook if email fails
        }
      }

      // Create in-app notification for scout about new evaluation request
      // Create if action is 'upfront_payment' OR if evaluation status is 'requested' (fallback)
      const shouldCreateScoutNotification = action === 'upfront_payment' || 
        (!action && evaluation.status === 'requested' && evaluation.payment_status === 'paid')
      
      if (shouldCreateScoutNotification) {
        try {
          console.log('📧 Creating notification for scout about evaluation request...', {
            scout_id: evaluation.scout_id,
            evaluation_id: evaluation.id,
            player_id: evaluation.player_id,
            action,
            evaluation_status: evaluation.status,
            payment_status: evaluation.payment_status,
          })
          
          const { data: playerProfile, error: playerProfileError } = await adminSupabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', evaluation.player_id)
            .maybeSingle()

          if (playerProfileError) {
            console.error('❌ Error fetching player profile for notification:', playerProfileError)
          }

          console.log('📧 Player profile for notification:', {
            player_name: playerProfile?.full_name,
            player_profile_error: playerProfileError,
          })

          const notificationCreated = await createNotification({
            userId: evaluation.scout_id,
            type: 'evaluation_requested',
            title: 'New Evaluation Request',
            message: `${playerProfile?.full_name || 'A player'} has requested an evaluation from you.`,
            link: `/evaluations/${evaluation.id}`,
            metadata: {
              evaluation_id: evaluation.id,
              player_id: evaluation.player_id,
              price: evaluation.price,
              action: action || 'upfront_payment', // Include action in metadata
            },
          })
          
          if (notificationCreated) {
            console.log('✅ Notification created successfully for scout:', evaluation.scout_id)
            console.log('✅ Notification details:', {
              scout_id: evaluation.scout_id,
              type: 'evaluation_requested',
              evaluation_id: evaluation.id,
              player_name: playerProfile?.full_name,
            })
          } else {
            console.error('❌ Failed to create notification - createNotification returned false')
            console.error('❌ Notification creation failed for scout:', evaluation.scout_id)
            console.error('❌ This means createNotification returned false - check logs above for details')
          }
        } catch (notificationError: any) {
          console.error('❌ Error creating evaluation request notification:', notificationError)
          console.error('❌ Notification error details:', {
            message: notificationError?.message,
            stack: notificationError?.stack,
            error: JSON.stringify(notificationError, Object.getOwnPropertyNames(notificationError)),
          })
          // Don't fail the webhook if notification fails, but log extensively
        }
      } else {
        console.log('⏭️ Skipping scout notification creation - conditions not met:', {
          action,
          evaluation_status: evaluation.status,
          payment_status: evaluation.payment_status,
          should_create: shouldCreateScoutNotification,
        })
      }

      // Create in-app notification for player about successful payment
      try {
        console.log('📧 Creating payment_received notification for player...', {
          player_id: evaluation.player_id,
          evaluation_id: evaluation.id,
          price: evaluation.price,
        })

        const notificationCreated = await createNotification({
          userId: evaluation.player_id,
          type: 'payment_received',
          title: 'Payment Received',
          message: `Your payment of $${evaluation.price.toFixed(2)} for the evaluation has been processed successfully.`,
          link: `/evaluations/${evaluation.id}`,
          metadata: {
            evaluation_id: evaluation.id,
            amount: evaluation.price,
            payment_intent_id: session.payment_intent as string,
          },
        })
        
        if (notificationCreated) {
          console.log('✅ Payment received notification created successfully for player:', evaluation.player_id)
          console.log('✅ Notification details:', {
            player_id: evaluation.player_id,
            type: 'payment_received',
            evaluation_id: evaluation.id,
            price: evaluation.price,
          })
        } else {
          console.error('❌ Failed to create payment_received notification - createNotification returned false')
          console.error('❌ Notification creation failed for player:', evaluation.player_id)
        }
      } catch (notificationError: any) {
        console.error('❌ Error creating payment received notification:', notificationError)
        console.error('❌ Payment notification error details:', {
          message: notificationError?.message,
          stack: notificationError?.stack,
          error: JSON.stringify(notificationError, Object.getOwnPropertyNames(notificationError)),
        })
        // Don't fail the webhook if notification fails
      }

      console.log(`✅ Payment successful for evaluation ${evaluation.id}, session ${session.id}`)
    } else if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      // Handle successful payment if needed
      console.log('Payment intent succeeded:', paymentIntent.id)
    } else if (event.type === 'payment_intent.payment_failed') {
      // Handle payment failure
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const paymentIntentId = paymentIntent.id
      
      if (paymentIntentId) {
        try {
          // Find evaluation by payment_intent_id
          const { data: evaluation } = await adminSupabase
            .from('evaluations')
            .select('*')
            .eq('payment_intent_id', paymentIntentId)
            .maybeSingle()

          if (evaluation) {
            // Create in-app notification for player about payment failure
            await createNotification({
              userId: evaluation.player_id,
              type: 'payment_failed',
              title: 'Payment Failed',
              message: `Your payment of $${evaluation.price.toFixed(2)} for the evaluation could not be processed. Please try again.`,
              link: `/evaluations/${evaluation.id}`,
              metadata: {
                evaluation_id: evaluation.id,
                amount: evaluation.price,
                payment_intent_id: paymentIntentId,
              },
            })
            console.log(`⚠️ Payment failed for evaluation ${evaluation.id}, notification sent`)
          }
        } catch (notificationError) {
          console.error('Error creating payment failed notification:', notificationError)
          // Don't fail the webhook if notification fails
        }
      }
    } else if (event.type === 'charge.failed') {
      // Handle charge failure (alternative event type)
      const charge = event.data.object as Stripe.Charge
      const paymentIntentId = charge.payment_intent as string
      
      if (paymentIntentId) {
        try {
          // Find evaluation by payment_intent_id
          const { data: evaluation } = await adminSupabase
            .from('evaluations')
            .select('*')
            .eq('payment_intent_id', paymentIntentId)
            .maybeSingle()

          if (evaluation) {
            // Create in-app notification for player about payment failure
            await createNotification({
              userId: evaluation.player_id,
              type: 'payment_failed',
              title: 'Payment Failed',
              message: `Your payment of $${evaluation.price.toFixed(2)} for the evaluation could not be processed. Please try again.`,
              link: `/evaluations/${evaluation.id}`,
              metadata: {
                evaluation_id: evaluation.id,
                amount: evaluation.price,
                payment_intent_id: paymentIntentId,
              },
            })
            console.log(`⚠️ Payment failed for evaluation ${evaluation.id}, notification sent`)
          }
        } catch (notificationError) {
          console.error('Error creating payment failed notification:', notificationError)
          // Don't fail the webhook if notification fails
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

