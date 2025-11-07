import { createRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

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

      const evaluationId = session.metadata?.evaluation_id
      const action = session.metadata?.action // 'upfront_payment' or 'scout_confirmed'

      if (!evaluationId) {
        console.error('No evaluation_id in session metadata:', session.id)
        return NextResponse.json({ error: 'Missing evaluation_id' }, { status: 400 })
      }

      // Get current evaluation to check status
      const { data: evaluation } = await adminSupabase
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

      // Update evaluation with payment info
      const updateData: any = {
        payment_status: 'paid',
        payment_intent_id: session.payment_intent as string,
        platform_fee: platformFee,
        scout_payout: scoutPayout,
      }

      // If this is upfront payment, status stays 'requested' (waiting for scout to confirm/deny)
      // If this is a scout-confirmed payment (old flow), update status to 'confirmed'
      if (action === 'scout_confirmed') {
        updateData.status = 'confirmed'
        updateData.confirmed_at = new Date().toISOString()
      }
      // For upfront_payment, status remains 'requested' but payment_status is 'paid'

      const { error: updateError } = await adminSupabase
        .from('evaluations')
        .update(updateData)
        .eq('id', evaluationId)

      if (updateError) {
        console.error('Error updating evaluation:', updateError)
        return NextResponse.json({ error: 'Failed to update evaluation' }, { status: 500 })
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
              evaluationId,
              evaluation.price
            )
          }
        } catch (emailError) {
          console.error('Error sending email notification:', emailError)
          // Don't fail the webhook if email fails
        }
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

