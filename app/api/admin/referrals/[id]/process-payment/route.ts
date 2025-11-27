import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/referrals/[id]/process-payment
 * Admin processes referral payment ($45, $65, or $125) to referrer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminResult = await requireAdmin(request)
    if (adminResult.response) {
      return adminResult.response
    }
    const { session } = adminResult

    const { payment_amount } = await request.json()

    // Validate payment amount
    if (![45, 65, 125].includes(payment_amount)) {
      return NextResponse.json(
        { error: 'Invalid payment amount. Must be $45, $65, or $125' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get referral record
    const { data: referral, error: fetchError } = await adminSupabase
      .from('referrals')
      .select('*, referrer_id, referred_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !referral) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      )
    }

    if (referral.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Payment already processed' },
        { status: 400 }
      )
    }

    // Get referrer's Stripe Connect account
    const { data: referrerProfile } = await adminSupabase
      .from('profiles')
      .select('stripe_account_id, full_name')
      .eq('user_id', referral.referrer_id)
      .single()

    if (!referrerProfile?.stripe_account_id) {
      return NextResponse.json(
        { error: 'Referrer does not have a Stripe Connect account' },
        { status: 400 }
      )
    }

    // Process payment from platform balance to referrer
    let transferId: string | null = null
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(payment_amount * 100), // Convert to cents
        currency: 'usd',
        destination: referrerProfile.stripe_account_id,
        metadata: {
          type: 'referral_bonus',
          referral_id: params.id,
          referrer_id: referral.referrer_id,
          referred_id: referral.referred_id,
          payment_amount: payment_amount.toString(),
        },
      })

      transferId = transfer.id
      console.log(`✅ Referral payment processed: $${payment_amount} to ${referrerProfile.full_name}`)
    } catch (stripeError: any) {
      console.error('❌ Error processing referral payment:', stripeError)
      return NextResponse.json(
        { 
          error: 'Failed to process payment',
          details: stripeError.message 
        },
        { status: 500 }
      )
    }

    // Update referral record
    const { data: updatedReferral, error: updateError } = await adminSupabase
      .from('referrals')
      .update({
        payment_amount: payment_amount,
        payment_status: 'paid',
        transfer_id: transferId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating referral:', updateError)
      return NextResponse.json(
        { error: 'Payment processed but failed to update record' },
        { status: 500 }
      )
    }

    return successResponse({
      referral: updatedReferral,
      message: `Payment of $${payment_amount} processed successfully`,
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to process referral payment')
  }
}

