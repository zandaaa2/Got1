import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications'
import { getUserEmail } from '@/lib/supabase-admin'
import { sendStripeAccountIssueEmail } from '@/lib/email'

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

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error(`Webhook signature verification failed:`, err.message)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

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
      const purchasedBy = session.metadata?.purchased_by // Parent or player user_id
      const purchasedByType = session.metadata?.purchased_by_type as 'player' | 'parent' | undefined

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
              purchased_by: purchasedBy || playerId, // Who purchased (parent or player)
              purchased_by_type: purchasedByType || 'player', // Type of purchaser
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
        console.error('Invalid action or missing required data:', { action, evaluationId, scoutId, playerId })
        return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 })
      }

      // Safety check: evaluation should always be set by now
      if (!evaluation) {
        console.error('CRITICAL: Evaluation is undefined after processing webhook')
        return NextResponse.json({ error: 'Failed to process evaluation' }, { status: 500 })
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
          const { data: playerProfile, error: playerProfileError } = await adminSupabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', evaluation.player_id)
            .maybeSingle()

          if (playerProfileError) {
            console.error('Error fetching player profile for notification:', playerProfileError)
          }

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
              action: action || 'upfront_payment',
            },
          })
          
          if (!notificationCreated) {
            console.error('Failed to create evaluation_requested notification for scout:', evaluation.scout_id)
          }
        } catch (notificationError: any) {
          console.error('Error creating evaluation request notification:', notificationError)
          // Don't fail the webhook if notification fails
        }
      }

      // Create in-app notification for player about successful payment
      try {
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
        
        if (!notificationCreated) {
          console.error('Failed to create payment_received notification for player:', evaluation.player_id)
        }
      } catch (notificationError: any) {
        console.error('Error creating payment received notification:', notificationError)
        // Don't fail the webhook if notification fails
      }
    } else if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      // Handle successful payment if needed
    } else if (event.type === 'payment_intent.payment_failed') {
      // Handle payment failure
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const paymentIntentId = paymentIntent.id
      
      // Extract failure details
      const errorCode = paymentIntent.last_payment_error?.code || 'unknown'
      const errorMessage = paymentIntent.last_payment_error?.message || 'Unknown error'
      const errorType = (paymentIntent.last_payment_error?.type || 'unknown') as string
      
      // Categorize failure type
      const isCardIssue = ['card_declined', 'insufficient_funds', 'expired_card', 'incorrect_cvc', 
                           'incorrect_number', 'generic_decline', 'lost_card', 'stolen_card'].includes(errorCode)
      const isSystemIssue = (errorType === 'api_error' || errorType === 'rate_limit_error' || errorCode === 'processing_error')
      const category = isSystemIssue ? 'SYSTEM_ERROR' : isCardIssue ? 'CARD_ISSUE' : 'UNKNOWN'
      
      console.log('❌ PAYMENT INTENT FAILED:', {
        payment_intent_id: paymentIntentId,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        failure_reason: errorCode,
        failure_message: errorMessage,
        error_type: errorType,
        category: category,
      })
      
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
              message: `Your payment of $${evaluation.price.toFixed(2)} for the evaluation could not be processed. ${errorMessage}. Please try again.`,
              link: `/evaluations/${evaluation.id}`,
              metadata: {
                evaluation_id: evaluation.id,
                amount: evaluation.price,
                payment_intent_id: paymentIntentId,
                error_code: errorCode,
                error_message: errorMessage,
                error_type: errorType,
                is_card_issue: isCardIssue,
                is_system_issue: isSystemIssue,
                category: category,
              },
            })
            console.log('✅ Payment failure notification sent to player:', evaluation.player_id, `[${category}]`)
          } else {
            console.warn('⚠️ No evaluation found for failed payment intent:', paymentIntentId, `[${category}]`)
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
      
      // Extract failure details
      const failureCode = charge.failure_code || 'unknown'
      const failureMessage = charge.failure_message || 'Unknown error'
      
      // Categorize failure type
      const isCardIssue = ['card_declined', 'insufficient_funds', 'expired_card', 'incorrect_cvc', 
                           'incorrect_number', 'generic_decline', 'lost_card', 'stolen_card'].includes(failureCode)
      const isSystemIssue = failureCode === 'api_error' || failureCode === 'rate_limit_error' || failureCode === 'processing_error'
      const category = isSystemIssue ? 'SYSTEM_ERROR' : isCardIssue ? 'CARD_ISSUE' : 'UNKNOWN'
      
      console.log('❌ CHARGE FAILED:', {
        charge_id: charge.id,
        payment_intent_id: paymentIntentId,
        amount: charge.amount / 100,
        currency: charge.currency,
        failure_code: failureCode,
        failure_message: failureMessage,
        category: category,
      })
      
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
              message: `Your payment of $${evaluation.price.toFixed(2)} for the evaluation could not be processed. ${failureMessage}. Please try again.`,
              link: `/evaluations/${evaluation.id}`,
              metadata: {
                evaluation_id: evaluation.id,
                amount: evaluation.price,
                payment_intent_id: paymentIntentId,
                error_code: failureCode,
                error_message: failureMessage,
                is_card_issue: isCardIssue,
                is_system_issue: isSystemIssue,
                category: category,
              },
            })
            console.log('✅ Payment failure notification sent to player:', evaluation.player_id, `[${category}]`)
          } else {
            console.warn('⚠️ No evaluation found for failed charge:', charge.id, paymentIntentId, `[${category}]`)
          }
        } catch (notificationError) {
          console.error('Error creating payment failed notification:', notificationError)
          // Don't fail the webhook if notification fails
        }
      }
    } else if (event.type === 'checkout.session.async_payment_failed') {
      // Handle checkout session payment failure
      const session = event.data.object as Stripe.Checkout.Session
      const playerId = session.metadata?.player_id
      const priceStr = session.metadata?.price
      
      // Get payment intent to extract failure details
      let errorCode = 'unknown'
      let errorMessage = 'Unknown error'
      let errorType = 'unknown'
      let isCardIssue = false
      let isSystemIssue = false
      let category = 'UNKNOWN'
      
      if (session.payment_intent && typeof session.payment_intent === 'string') {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent)
          errorCode = paymentIntent.last_payment_error?.code || 'unknown'
          errorMessage = paymentIntent.last_payment_error?.message || 'Unknown error'
          errorType = (paymentIntent.last_payment_error?.type || 'unknown') as string
          
          isCardIssue = ['card_declined', 'insufficient_funds', 'expired_card', 'incorrect_cvc', 
                        'incorrect_number', 'generic_decline', 'lost_card', 'stolen_card'].includes(errorCode)
          isSystemIssue = (errorType === 'api_error' || errorType === 'rate_limit_error' || errorCode === 'processing_error')
          category = isSystemIssue ? 'SYSTEM_ERROR' : isCardIssue ? 'CARD_ISSUE' : 'UNKNOWN'
        } catch (piError) {
          console.error('Error retrieving payment intent for failed checkout:', piError)
        }
      }
      
      console.log('❌ CHECKOUT SESSION PAYMENT FAILED:', {
        checkout_session_id: session.id,
        payment_status: session.payment_status,
        player_id: playerId,
        amount: priceStr ? parseFloat(priceStr) : 0,
        failure_reason: errorCode,
        failure_message: errorMessage,
        error_type: errorType,
        category: category,
      })
      
      if (playerId) {
        try {
          await createNotification({
            userId: playerId,
            type: 'payment_failed',
            title: 'Payment Failed',
            message: `Your payment of $${priceStr ? parseFloat(priceStr).toFixed(2) : '0.00'} could not be processed. ${errorMessage}. Please try again.`,
            link: '/browse',
            metadata: {
              checkout_session_id: session.id,
              scout_id: session.metadata?.scout_id,
              amount: priceStr ? parseFloat(priceStr) : 0,
              error_code: errorCode,
              error_message: errorMessage,
              error_type: errorType,
              is_card_issue: isCardIssue,
              is_system_issue: isSystemIssue,
              category: category,
            },
          })
          console.log('✅ Payment failure notification sent to player:', playerId, `[${category}]`)
        } catch (error) {
          console.error('Error creating payment failed notification:', error)
        }
      } else {
        console.warn('⚠️ No player_id in checkout session metadata for failed payment:', session.id, `[${category}]`)
      }
    } else if (event.type === 'account.updated') {
      // Handle Stripe Connect account updates (restrictions, requirements, etc.)
      const account = event.data.object as Stripe.Account
      const accountId = account.id
      
      console.log('🔔 Stripe Account Updated:', {
        account_id: accountId,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements ? {
          currently_due: account.requirements.currently_due,
          past_due: account.requirements.past_due,
          eventually_due: account.requirements.eventually_due,
        } : null,
      })
      
      // Find the user with this Stripe account ID
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('user_id, full_name, email, role')
        .eq('stripe_account_id', accountId)
        .maybeSingle()
      
      if (!profile || profile.role !== 'scout') {
        console.log('⚠️ No scout profile found for Stripe account:', accountId)
        return NextResponse.json({ received: true })
      }
      
      // Check for issues
      const issues: string[] = []
      let issueType = 'unknown'
      let issueDetails = ''
      
      // Check if account is restricted
      if (!account.charges_enabled || !account.payouts_enabled || !account.details_submitted) {
        if (!account.charges_enabled) {
          issues.push('Charges are disabled on your account')
          issueType = 'charges_disabled'
        }
        if (!account.payouts_enabled) {
          issues.push('Payouts are disabled on your account')
          issueType = 'payouts_disabled'
        }
        if (!account.details_submitted) {
          issues.push('Account details need to be submitted')
          issueType = 'details_missing'
        }
      }
      
      // Check for restrictions
      if (account.requirements) {
        const hasPastDue = account.requirements.past_due && account.requirements.past_due.length > 0
        const hasCurrentlyDue = account.requirements.currently_due && account.requirements.currently_due.length > 0
        
        if (hasPastDue || hasCurrentlyDue) {
          issueType = 'restricted'
          if (hasPastDue && account.requirements.past_due) {
            issues.push(`Past due requirements: ${account.requirements.past_due.join(', ')}`)
          }
          if (hasCurrentlyDue && account.requirements.currently_due) {
            issues.push(`Required information needed: ${account.requirements.currently_due.join(', ')}`)
          }
        }
      }
      
      // If there are issues, send email
      if (issues.length > 0) {
        issueDetails = issues.join('\n\n')
        
        try {
          const userEmail = await getUserEmail(profile.user_id)
          if (userEmail) {
            await sendStripeAccountIssueEmail(
              userEmail,
              profile.full_name || 'there',
              issueType,
              issueDetails
            )
            console.log('✅ Stripe account issue email sent to scout:', userEmail)
            
            // Also create in-app notification
            await createNotification({
              userId: profile.user_id,
              type: 'stripe_account_issue',
              title: 'Stripe Account Issue',
              message: `Your Stripe Connect account has an issue that needs attention: ${issues[0]}`,
              link: '/profile',
              metadata: {
                stripe_account_id: accountId,
                issue_type: issueType,
                charges_enabled: account.charges_enabled,
                payouts_enabled: account.payouts_enabled,
              },
            })
          }
        } catch (emailError) {
          console.error('Error sending Stripe account issue email:', emailError)
        }
      }
    } else if (event.type === 'capability.updated') {
      // Handle Stripe Connect capability updates (when capabilities are disabled/enabled)
      const capability = event.data.object as Stripe.Capability
      const accountId = capability.account as string
      
      console.log('🔔 Stripe Capability Updated:', {
        account_id: accountId,
        capability_id: capability.id,
        capability_type: capability.id, // Capability.id contains the type (e.g., 'card_payments', 'transfers')
        status: capability.status,
        requirements: capability.requirements ? {
          currently_due: capability.requirements.currently_due,
          past_due: capability.requirements.past_due,
        } : null,
      })
      
      // Only send notification if capability is disabled or has requirements
      if (capability.status === 'inactive' || 
          (capability.requirements && (capability.requirements.past_due?.length > 0 || capability.requirements.currently_due?.length > 0))) {
        
        // Find the user with this Stripe account ID
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('user_id, full_name, email, role')
          .eq('stripe_account_id', accountId)
          .maybeSingle()
        
        if (!profile || profile.role !== 'scout') {
          console.log('⚠️ No scout profile found for Stripe account:', accountId)
          return NextResponse.json({ received: true })
        }
        
        let issueType = 'capability_disabled'
        let issueDetails = `The ${capability.id} capability on your Stripe Connect account is ${capability.status}.`
        
        if (capability.requirements) {
          if (capability.requirements.past_due && capability.requirements.past_due.length > 0) {
            issueDetails += `\n\nPast due requirements: ${capability.requirements.past_due.join(', ')}`
          }
          if (capability.requirements.currently_due && capability.requirements.currently_due.length > 0) {
            issueDetails += `\n\nRequired information: ${capability.requirements.currently_due.join(', ')}`
          }
        }
        
        try {
          const userEmail = await getUserEmail(profile.user_id)
          if (userEmail) {
            await sendStripeAccountIssueEmail(
              userEmail,
              profile.full_name || 'there',
              issueType,
              issueDetails
            )
            console.log('✅ Stripe capability issue email sent to scout:', userEmail)
            
            // Also create in-app notification
            await createNotification({
              userId: profile.user_id,
              type: 'stripe_account_issue',
              title: 'Stripe Account Capability Issue',
              message: `The ${capability.id} capability on your Stripe account needs attention.`,
              link: '/profile',
              metadata: {
                stripe_account_id: accountId,
                capability_type: capability.id, // Capability.id contains the type (e.g., 'card_payments', 'transfers')
                capability_status: capability.status,
                issue_type: issueType,
              },
            })
          }
        } catch (emailError) {
          console.error('Error sending Stripe capability issue email:', emailError)
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

