import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'

import { createRouteHandlerClient } from '@/lib/supabase'
import { getUserEmail } from '@/lib/supabase-admin'
import { sendEvaluationCancelledEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

/**
 * Player cancels an evaluation request.
 * If payment has already been collected (upfront flow), issues a refund and updates the evaluation row.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient(() => cookieStore)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    if (evaluation.player_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the requesting player can cancel this evaluation.' },
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

    if (hasPaid) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: evaluation.payment_intent_id!,
          reason: 'requested_by_customer',
        })
        console.log('✅ Refund issued for cancellation:', refund.id, 'Amount:', refund.amount / 100)
      } catch (error: any) {
        console.error('❌ Error issuing refund during cancellation:', error)
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

    return NextResponse.json({
      success: true,
      status: 'cancelled',
      refunded: hasPaid,
    })
  } catch (error: any) {
    console.error('Error cancelling evaluation:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


