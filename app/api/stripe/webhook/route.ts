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

      const evaluationId = session.metadata?.evaluation_id

      if (evaluationId) {
        // Update evaluation status to 'pending' (waiting for scout to complete)
        // Payment is successful, now waiting for scout to complete evaluation
        await supabase
          .from('evaluations')
          .update({
            status: 'pending',
            // Store payment confirmation
          })
          .eq('id', evaluationId)
      }
    } else if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      // Handle successful payment if needed
      console.log('Payment succeeded:', paymentIntent.id)
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

