import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendEvaluationCompleteEmail } from '@/lib/email'
import { getUserEmail } from '@/lib/supabase-admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

/**
 * Sends an email notification when an evaluation is completed.
 * This is called after the evaluation status is updated to 'completed'.
 * 
 * @param request - Next.js request object containing evaluationId
 * @returns Success or error response
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { evaluationId } = body

    if (!evaluationId) {
      return NextResponse.json(
        { error: 'Missing evaluationId' },
        { status: 400 }
      )
    }

    // Get evaluation with profiles
    const { data: evaluation } = await supabase
      .from('evaluations')
      .select('*')
      .eq('id', evaluationId)
      .maybeSingle()

    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
    }

    // Verify the user submitting is the scout
    if (evaluation.scout_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get player profile
    const { data: playerProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', evaluation.player_id)
      .maybeSingle()

    if (!playerProfile) {
      return NextResponse.json({ error: 'Player profile not found' }, { status: 404 })
    }

    // Get scout profile
    const { data: scoutProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', evaluation.scout_id)
      .maybeSingle()

    if (!scoutProfile) {
      return NextResponse.json({ error: 'Scout profile not found' }, { status: 404 })
    }

    // Verify payment was completed (status should be 'confirmed' or 'in_progress')
    if (evaluation.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed. Cannot process payout.' },
        { status: 400 }
      )
    }

    // Process payout if not already done
    let transferId = evaluation.transfer_id
    if (!transferId && scoutProfile.stripe_account_id) {
      try {
        // Calculate amounts (already calculated in webhook, but recalculate for safety)
        const platformFee = Math.round(evaluation.price * 0.1 * 100) / 100
        const scoutPayout = Math.round(evaluation.price * 0.9 * 100) / 100

        // Get payment intent to transfer from
        if (!evaluation.payment_intent_id) {
          console.error('No payment_intent_id found for evaluation:', evaluationId)
          return NextResponse.json(
            { error: 'Payment intent not found' },
            { status: 400 }
          )
        }

        // Retrieve the payment intent to get the charge ID
        const paymentIntent = await stripe.paymentIntents.retrieve(evaluation.payment_intent_id)
        
        // Get the charge ID from the payment intent
        let chargeId: string | null = null
        if (paymentIntent.latest_charge) {
          // If latest_charge is a string, it's the charge ID
          chargeId = typeof paymentIntent.latest_charge === 'string' 
            ? paymentIntent.latest_charge 
            : paymentIntent.latest_charge.id
        } else {
          // Fallback: list charges for this payment intent
          const charges = await stripe.charges.list({
            payment_intent: evaluation.payment_intent_id,
            limit: 1
          })
          if (charges.data && charges.data.length > 0) {
            chargeId = charges.data[0].id
          }
        }

        if (!chargeId) {
          console.error('No charge found for payment intent:', evaluation.payment_intent_id)
          return NextResponse.json(
            { error: 'Payment charge not found' },
            { status: 400 }
          )
        }

        // Transfer funds to scout's Stripe Connect account
        // Convert to cents for Stripe
        const transferAmount = Math.round(scoutPayout * 100)

        const transfer = await stripe.transfers.create({
          amount: transferAmount,
          currency: 'usd',
          destination: scoutProfile.stripe_account_id,
          source_transaction: chargeId, // Transfer from the original charge
          metadata: {
            evaluation_id: evaluationId,
            scout_user_id: evaluation.scout_id,
            player_user_id: evaluation.player_id,
            platform_fee: platformFee.toString(),
            scout_payout: scoutPayout.toString(),
          },
        })

        transferId = transfer.id

        // Update evaluation with transfer ID
        const { error: updateError } = await supabase
          .from('evaluations')
          .update({
            transfer_id: transferId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', evaluationId)

        if (updateError) {
          console.error('Error updating evaluation with transfer_id:', updateError)
        } else {
          console.log(`✅ Payout successful: Transferred $${scoutPayout.toFixed(2)} to scout ${scoutProfile.stripe_account_id}, transfer ID: ${transferId}`)
        }
      } catch (stripeError: any) {
        console.error('Error processing payout:', stripeError)
        // Don't fail the request - email can still be sent
        // The payout can be retried later
        return NextResponse.json(
          { 
            error: 'Failed to process payout',
            details: stripeError.message,
            warning: 'Email notifications may still be sent'
          },
          { status: 500 }
        )
      }
    } else if (!scoutProfile.stripe_account_id) {
      console.warn(`⚠️ Scout ${evaluation.scout_id} does not have a Stripe Connect account. Cannot process payout.`)
    } else if (transferId) {
      console.log(`ℹ️ Payout already processed for evaluation ${evaluationId}, transfer ID: ${transferId}`)
    }

    // Get player's email
    const playerEmail = await getUserEmail(evaluation.player_id)

    // Send email notification to player
    if (playerEmail) {
      try {
        await sendEvaluationCompleteEmail(
          playerEmail,
          playerProfile.full_name || 'Player',
          scoutProfile?.full_name || 'Scout',
          evaluationId
        )
      } catch (emailError) {
        console.error('Error sending evaluation complete email:', emailError)
        // Don't fail the request if email fails
      }
    } else {
      console.log('⚠️  Could not send evaluation complete email - player email not available (SUPABASE_SERVICE_ROLE_KEY may not be configured)')
    }

    // TODO: Send email to scout with payout info
    // TODO: Send email to admin with payment update

    return NextResponse.json({ 
      success: true,
      transferId: transferId || null,
      payoutProcessed: !!transferId
    })
  } catch (error: any) {
    console.error('Error in evaluation complete email:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

