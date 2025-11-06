import { createRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'
import { sendEvaluationRequestEmail, sendEvaluationDeniedEmail, sendEvaluationConfirmedEmail } from '@/lib/email'
import { getUserEmail } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

/**
 * Scout confirms or denies an evaluation request.
 * If confirmed: Charges payment and moves to 'confirmed' status (money in escrow)
 * If denied: Updates status to 'denied' and sends email to player
 */
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
    const { evaluationId, action, deniedReason } = body // action: 'confirm' or 'deny'

    if (!evaluationId || !action) {
      return NextResponse.json(
        { error: 'Missing evaluationId or action' },
        { status: 400 }
      )
    }

    if (!['confirm', 'deny'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "confirm" or "deny"' },
        { status: 400 }
      )
    }

    // Get evaluation
    const { data: evaluation, error: evalError } = await supabase
      .from('evaluations')
      .select('*')
      .eq('id', evaluationId)
      .maybeSingle()

    if (evalError || !evaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      )
    }

    // Verify the user is the scout
    if (evaluation.scout_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - only the scout can confirm/deny' },
        { status: 403 }
      )
    }

    // Verify status is 'requested'
    if (evaluation.status !== 'requested') {
      return NextResponse.json(
        { error: `Evaluation is already ${evaluation.status}. Cannot confirm/deny.` },
        { status: 400 }
      )
    }

    if (action === 'deny') {
      // Update status to denied
      const { error: updateError } = await supabase
        .from('evaluations')
        .update({
          status: 'denied',
          denied_at: new Date().toISOString(),
          denied_reason: deniedReason || null,
        })
        .eq('id', evaluationId)

      if (updateError) {
        console.error('Error updating evaluation:', updateError)
        return NextResponse.json(
          { error: 'Failed to deny evaluation' },
          { status: 500 }
        )
      }

      // Send email to player
      try {
        console.log('📧 Attempting to send denial email to player:', evaluation.player_id)
        const playerEmail = await getUserEmail(evaluation.player_id)
        console.log('📧 Player email retrieved:', playerEmail ? `Found: ${playerEmail}` : 'NOT FOUND')
        console.log('📧 Player email value:', playerEmail)
        
        const { data: playerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', evaluation.player_id)
          .maybeSingle()
        const { data: scoutProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', evaluation.scout_id)
          .maybeSingle()

        if (playerEmail && playerProfile) {
          console.log(`📧 Attempting to send denial email to: ${playerEmail}`)
          console.log(`📧 Player profile found:`, !!playerProfile)
          console.log(`📧 Scout name:`, scoutProfile?.full_name || 'Scout')
          
          try {
            await sendEvaluationDeniedEmail(
              playerEmail,
              playerProfile.full_name || 'Player',
              scoutProfile?.full_name || 'Scout',
              deniedReason || 'No reason provided'
            )
            console.log('✅ Denial email function completed successfully')
          } catch (emailSendError: any) {
            console.error('❌ Error in sendEvaluationDeniedEmail:', emailSendError)
            console.error('❌ Error message:', emailSendError?.message)
            console.error('❌ Error stack:', emailSendError?.stack)
            throw emailSendError // Re-throw to be caught by outer catch
          }
        } else {
          console.warn('⚠️ Cannot send email - missing playerEmail or playerProfile:', {
            hasEmail: !!playerEmail,
            hasProfile: !!playerProfile,
            playerEmail,
            playerProfile: playerProfile ? { name: playerProfile.full_name } : null
          })
        }
      } catch (emailError: any) {
        console.error('❌ Error sending denial email (outer catch):', emailError)
        console.error('❌ Error details:', {
          message: emailError?.message,
          name: emailError?.name,
          code: emailError?.code,
          response: emailError?.response
        })
        // Don't fail the request if email fails
      }

      return NextResponse.json({ 
        success: true, 
        status: 'denied',
        message: 'Evaluation request denied'
      })
    }

    // Action is 'confirm' - charge payment
    try {
      // Get player profile to get payment method (we'll need to collect this first)
      // For now, we'll use Stripe Checkout to collect payment
      // TODO: If player has saved payment method, use it. Otherwise, redirect to checkout.
      
      // Get player and scout profiles
      const { data: playerProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', evaluation.player_id)
        .maybeSingle()

      const { data: scoutProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', evaluation.scout_id)
        .maybeSingle()

      if (!playerProfile || !scoutProfile) {
        return NextResponse.json(
          { error: 'Player or scout profile not found' },
          { status: 404 }
        )
      }

      // Create Stripe Checkout Session for player payment
      // Player will need to complete this payment to move status to 'confirmed'
      const playerEmail = await getUserEmail(evaluation.player_id)
      
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: playerEmail || undefined, // Convert null to undefined
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Evaluation from ${scoutProfile.full_name || 'Scout'}`,
                description: `Football player evaluation service`,
              },
              unit_amount: Math.round(evaluation.price * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${request.nextUrl.origin}/evaluations/${evaluationId}?payment=success`,
        cancel_url: `${request.nextUrl.origin}/evaluations/${evaluationId}?payment=cancelled`,
        metadata: {
          evaluation_id: evaluationId,
          scout_id: evaluation.scout_id,
          player_id: evaluation.player_id,
          action: 'scout_confirmed', // Special flag to indicate scout confirmed
        },
      })

      // Store checkout session URL for player to complete payment
      // Status stays 'requested' until player completes payment
      const { error: updateError } = await supabase
        .from('evaluations')
        .update({
          payment_intent_id: checkoutSession.payment_intent as string || null,
          // Store session URL or ID for player to access
        })
        .eq('id', evaluationId)

      if (updateError) {
        console.error('Error updating evaluation with payment intent:', updateError)
      }

      // Send email to player with payment link
      try {
        const playerEmail = await getUserEmail(evaluation.player_id)
        if (playerEmail && playerProfile && checkoutSession.url) {
          await sendEvaluationConfirmedEmail(
            playerEmail,
            playerProfile.full_name || 'Player',
            scoutProfile.full_name || 'Scout',
            evaluationId,
            checkoutSession.url,
            evaluation.price
          )
          console.log(`✅ Confirmation email sent to ${playerEmail} with payment link`)
        } else {
          console.warn('⚠️ Could not send confirmation email:', {
            hasEmail: !!playerEmail,
            hasProfile: !!playerProfile,
            hasPaymentUrl: !!checkoutSession.url
          })
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError)
        // Don't fail the request if email fails
      }

      return NextResponse.json({ 
        success: true,
        sessionId: checkoutSession.id,
        paymentUrl: checkoutSession.url, // Player needs to visit this URL
        message: 'Evaluation confirmed. Player will be notified to complete payment.'
      })
    } catch (error: any) {
      console.error('Error creating payment session:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create payment session' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in evaluation confirm:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

