import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { getUserEmail } from '@/lib/supabase-admin'
import { sendEvaluationCancelledEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

/**
 * Player cancels an evaluation request.
 * If payment has already been collected (upfront flow), issues a refund and updates the evaluation row.
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
    const { evaluationId, reason } = body

    if (!evaluationId) {
      return NextResponse.json({ error: 'Missing evaluationId' }, { status: 400 })
    }

    const { data: evaluation, error: evalError } = await supabase
      .from('evaluations')
      .select('*')
      .eq('id', evaluationId)
      .maybeSingle()

    if (evalError || !evaluation) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
    }

    // Check if user is the player OR the parent who purchased it
    const isPlayer = evaluation.player_id === session.user.id
    const isParentPurchaser = evaluation.purchased_by === session.user.id && evaluation.purchased_by_type === 'parent'
    
    if (!isPlayer && !isParentPurchaser) {
      return NextResponse.json(
        { error: 'Only the requesting player or purchasing parent can cancel this evaluation.' },
        { status: 403 }
      )
    }

    if (evaluation.status !== 'requested') {
      return NextResponse.json(
        { error: `Evaluation is already ${evaluation.status}. Only pending requests can be cancelled.` },
        { status: 400 }
      )
    }

    const hasPaid = evaluation.payment_status === 'paid' && !!evaluation.payment_intent_id

    let refund: Stripe.Refund | null = null
    if (hasPaid) {
      try {
        refund = await stripe.refunds.create({
          payment_intent: evaluation.payment_intent_id!,
          reason: 'requested_by_customer',
        })
        // Refund created successfully
      } catch (error: any) {
        console.error('Error issuing refund during cancellation:', error)
        return NextResponse.json(
          { error: 'Failed to refund payment. Please contact support.' },
          { status: 500 }
        )
      }
    }

    const updatePayload: Record<string, any> = {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: reason || null,
      payment_status: hasPaid ? 'refunded' : evaluation.payment_status,
      platform_fee: hasPaid ? 0 : evaluation.platform_fee,
      scout_payout: hasPaid ? 0 : evaluation.scout_payout,
    }

    const { error: updateError } = await supabase
      .from('evaluations')
      .update(updatePayload)
      .eq('id', evaluationId)

    if (updateError) {
      console.error('Error updating evaluation cancellation:', updateError)
      return NextResponse.json({ error: 'Failed to cancel evaluation' }, { status: 500 })
    }

    try {
      const scoutEmail = await getUserEmail(evaluation.scout_id)
      if (scoutEmail) {
        await sendEvaluationCancelledEmail(
          scoutEmail,
          evaluationId,
          hasPaid
        )
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send cancellation email notification:', emailError)
      // Do not fail request if email fails
    }

    // Create in-app notification for scout about cancellation
    try {
      const { data: playerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', evaluation.player_id)
        .maybeSingle()

      await createNotification({
        userId: evaluation.scout_id,
        type: 'evaluation_cancelled',
        title: 'Evaluation Cancelled',
        message: `${playerProfile?.full_name || 'A player'} has cancelled their evaluation request.${hasPaid ? ' Payment has been refunded.' : ''}`,
        link: `/my-evals`,
        metadata: {
          evaluation_id: evaluationId,
          player_id: evaluation.player_id,
          refunded: hasPaid,
        },
      })
    } catch (notificationError) {
      console.error('Error creating cancellation notification:', notificationError)
      // Don't fail the request if notification fails
    }

    // Create in-app notification for player about refund (if payment was made and refund was successfully created)
    if (hasPaid && refund) {
      try {
        // Determine refund message based on Stripe refund status
        let refundMessage = ''
        if (refund.status === 'succeeded') {
          refundMessage = `Your refund of $${evaluation.price.toFixed(2)} has been processed and will appear in your account within 5-10 business days.`
        } else if (refund.status === 'pending') {
          refundMessage = `Your refund of $${evaluation.price.toFixed(2)} has been initiated and is processing. The funds will be returned to your original payment method within 5-10 business days.`
        } else {
          refundMessage = `Your refund of $${evaluation.price.toFixed(2)} has been requested. If you don't see the refund in 5-10 business days, please contact support.`
        }

        const notificationResult = await createNotification({
          userId: evaluation.player_id,
          type: 'payment_refunded',
          title: 'Payment Refunded',
          message: refundMessage,
          link: `/evaluations/${evaluationId}`,
          metadata: {
            evaluation_id: evaluationId,
            amount: evaluation.price,
            refund_id: refund.id,
            refund_status: refund.status,
            refund_reason: 'cancelled_by_player',
          },
        })

        if (!notificationResult) {
          console.error('Failed to create payment_refunded notification for player:', evaluation.player_id)
        }
      } catch (playerNotificationError: any) {
        console.error('Error creating player refund notification:', playerNotificationError)
        // Don't fail the request if notification fails
      }
    } else if (hasPaid && !refund) {
      console.error('WARNING: hasPaid is true but refund is null - refund may have failed silently')
    }

    return successResponse({
      success: true,
      status: 'cancelled',
      refunded: hasPaid,
    })
  } catch (error: any) {
    return handleApiError(error, 'Internal server error')
  }
}


