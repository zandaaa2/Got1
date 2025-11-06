import { createRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'

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

  const cookieStore = cookies()
  const supabase = createRouteHandlerClient(() => cookieStore)

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Verify payment was successful
      if (session.payment_status !== 'paid') {
        console.warn(`Payment not completed for session ${session.id}. Status: ${session.payment_status}`)
        return NextResponse.json({ received: true, warning: 'Payment not completed' })
      }

      const evaluationId = session.metadata?.evaluation_id
      const action = session.metadata?.action // 'scout_confirmed' or undefined

      if (!evaluationId) {
        console.error('No evaluation_id in session metadata:', session.id)
        return NextResponse.json({ error: 'Missing evaluation_id' }, { status: 400 })
      }

      // Get current evaluation to check status
      const { data: evaluation } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', evaluationId)
        .maybeSingle()

      if (!evaluation) {
        console.error('Evaluation not found:', evaluationId)
        return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
      }

      // Calculate fees (10% platform, 90% scout)
      const platformFee = Math.round(evaluation.price * 0.1 * 100) / 100
      const scoutPayout = Math.round(evaluation.price * 0.9 * 100) / 100

      // If scout confirmed, move to 'confirmed' status (money in escrow)
      // Otherwise, this is the old flow (shouldn't happen anymore)
      const newStatus = action === 'scout_confirmed' ? 'confirmed' : 'in_progress'

      // Update evaluation status and payment info
      const { error: updateError } = await supabase
        .from('evaluations')
        .update({
          status: newStatus,
          payment_status: 'paid',
          payment_intent_id: session.payment_intent as string || null,
          platform_fee: platformFee,
          scout_payout: scoutPayout,
          confirmed_at: action === 'scout_confirmed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', evaluationId)

      if (updateError) {
        console.error('Error updating evaluation:', updateError)
        throw updateError
      }

      console.log(`✅ Payment successful for evaluation ${evaluationId}, session ${session.id}`)
    } else if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      // Handle successful payment if needed
      console.log('Payment intent succeeded:', paymentIntent.id)
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

