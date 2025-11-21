import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export const dynamic = 'force-dynamic'

/**
 * POST /api/referrals/select-referrer
 * Creates a referral when a new user selects a referrer during signup
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }

    const { session } = authResult
    const { referrer_id, referred_role } = await request.json()

    if (!referrer_id) {
      return NextResponse.json(
        { error: 'Referrer ID is required' },
        { status: 400 }
      )
    }

    if (!referred_role || !['player', 'scout', 'user'].includes(referred_role)) {
      return NextResponse.json(
        { error: 'Invalid referred role' },
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

    // Prevent self-referral
    if (referrer_id === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot refer yourself' },
        { status: 400 }
      )
    }

    // Check if referrer is approved for the referral program
    const { data: referrerApplication } = await adminSupabase
      .from('referral_program_applications')
      .select('status')
      .eq('user_id', referrer_id)
      .eq('status', 'approved')
      .maybeSingle()

    if (!referrerApplication) {
      return NextResponse.json(
        { error: 'This referrer is not approved for the referral program' },
        { status: 400 }
      )
    }

    // Get referrer's role
    const { data: referrerProfile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('user_id', referrer_id)
      .maybeSingle()

    if (!referrerProfile || !referrerProfile.role) {
      return NextResponse.json(
        { error: 'Referrer profile not found' },
        { status: 404 }
      )
    }

    // Check if referral already exists
    const { data: existingReferral } = await adminSupabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', referrer_id)
      .eq('referred_id', session.user.id)
      .maybeSingle()

    if (existingReferral) {
      return NextResponse.json(
        { error: 'Referral already exists' },
        { status: 400 }
      )
    }

    // Calculate earnings: $5 for scout referral, $2 for player referral
    const amountEarned = referrerProfile.role === 'scout' ? 5.00 : 2.00

    // Get referrer's Stripe Connect account ID (required for payout)
    const { data: referrerProfileFull } = await adminSupabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('user_id', referrer_id)
      .maybeSingle()

    let transferId: string | null = null
    let paymentStatus: 'pending' | 'paid' = 'pending'

    // Only scouts get automatic payments (they have Stripe Connect accounts)
    if (referrerProfile.role === 'scout' && referrerProfileFull?.stripe_account_id) {
      try {
        // Transfer funds to scout's Stripe Connect account
        // Note: This requires the platform account to have available balance
        // Or you can use Payment Intents with destination charges
        const transfer = await stripe.transfers.create({
          amount: Math.round(amountEarned * 100), // Convert to cents
          currency: 'usd',
          destination: referrerProfileFull.stripe_account_id,
          metadata: {
            type: 'referral_bonus',
            referrer_id: referrer_id,
            referred_id: session.user.id,
            referred_role: referred_role,
          },
        })

        transferId = transfer.id
        paymentStatus = 'paid'
        console.log('✅ Referral payment transferred successfully:', transfer.id)
      } catch (stripeError: any) {
        console.error('❌ Error processing referral payment:', stripeError)
        // If transfer fails, we'll still create the referral record but mark it as pending
        // This allows manual processing later
        paymentStatus = 'pending'
        // Log the error but don't fail the referral creation
        console.error('Referral payment failed, will be processed manually:', {
          referrer_id,
          amount: amountEarned,
          error: stripeError.message,
        })
      }
    }

    // Create referral record
    const { data: referral, error: insertError } = await adminSupabase
      .from('referrals')
      .insert({
        referrer_id: referrer_id,
        referred_id: session.user.id,
        referrer_role: referrerProfile.role,
        referred_role: referred_role,
        amount_earned: amountEarned,
        status: paymentStatus === 'paid' ? 'paid' : 'pending', // Auto-mark as paid if transfer succeeded
        transfer_id: transferId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating referral:', insertError)
      return NextResponse.json(
        { error: insertError.message || 'Failed to create referral' },
        { status: 500 }
      )
    }

    return successResponse({ 
      referral,
      paymentProcessed: paymentStatus === 'paid',
      transferId,
      message: paymentStatus === 'paid' 
        ? 'Referral recorded and payment processed successfully!' 
        : 'Referral recorded successfully! Payment will be processed manually.' 
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to create referral')
  }
}

