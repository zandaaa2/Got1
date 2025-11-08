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
      // Check if payment was made (upfront payment flow)
      const shouldRefund = evaluation.payment_status === 'paid' && evaluation.payment_intent_id
      
      if (shouldRefund) {
        console.log('💰 Issuing refund for payment_intent:', evaluation.payment_intent_id)
        try {
          const refund = await stripe.refunds.create({
            payment_intent: evaluation.payment_intent_id,
            reason: 'requested_by_customer',
          })
          console.log('✅ Refund issued:', refund.id, 'Amount:', refund.amount / 100)
        } catch (refundError: any) {
          console.error('❌ Error issuing refund:', refundError)
          // Continue with denial even if refund fails - can be issued manually
        }
      }
      
      // Update status to denied
      const { error: updateError } = await supabase
        .from('evaluations')
        .update({
          status: 'denied',
          denied_at: new Date().toISOString(),
          denied_reason: deniedReason || null,
          payment_status: shouldRefund ? 'refunded' : evaluation.payment_status,
          platform_fee: shouldRefund ? 0 : evaluation.platform_fee,
          scout_payout: shouldRefund ? 0 : evaluation.scout_payout,
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
        refunded: shouldRefund,
        message: 'Evaluation request denied' + (shouldRefund ? ' and payment refunded' : '')
      })
    }

    // Confirm action: ensure payment already completed in upfront flow
    if (evaluation.payment_status !== 'paid') {
      return NextResponse.json(
        {
          error: 'Payment not completed yet. Player must finish checkout before confirmation.',
          status: evaluation.payment_status,
        },
        { status: 409 }
      )
    }

    const { error: confirmError } = await supabase
      .from('evaluations')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', evaluationId)

    if (confirmError) {
      console.error('Error confirming evaluation:', confirmError)
      return NextResponse.json(
        { error: 'Failed to confirm evaluation' },
        { status: 500 }
      )
    }

    try {
      const playerEmail = await getUserEmail(evaluation.player_id)
      if (playerEmail) {
        const { data: scoutProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', evaluation.scout_id)
          .maybeSingle()

        const { data: playerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', evaluation.player_id)
          .maybeSingle()

        await sendEvaluationConfirmedEmail(
          playerEmail,
          playerProfile?.full_name || 'Player',
          scoutProfile?.full_name || 'Scout',
          evaluationId,
          '',
          evaluation.price
        )
      }
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError)
    }

    return NextResponse.json({
      success: true,
      status: 'confirmed',
      message: 'Evaluation confirmed. Payment already captured and held in escrow.',
    })
  } catch (error: any) {
    console.error('Error in evaluation confirm:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

