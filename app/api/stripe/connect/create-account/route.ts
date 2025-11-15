import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

/**
 * Creates a Stripe Connect account for the current user (if they're a scout).
 * This can be used to manually create accounts for existing scouts.
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    // Get scout profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, role, full_name, user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return handleApiError(profileError, 'Failed to fetch profile')
    }

    if (!profile) {
      console.error('Profile not found for user:', session.user.id)
      return NextResponse.json(
        { error: 'Profile not found. Please complete your profile setup first.' },
        { status: 404 }
      )
    }

    if (profile.role !== 'scout') {
      return NextResponse.json(
        { error: 'Only scouts can have Stripe Connect accounts' },
        { status: 403 }
      )
    }

    // Check if scout already has a Stripe account
    if (profile.stripe_account_id) {
      return NextResponse.json({
        success: true,
        accountId: profile.stripe_account_id,
        message: 'Scout already has a Stripe Connect account',
        existing: true
      })
    }

    // Get user email from auth
    const { data: { user } } = await supabase.auth.getUser()
    const userEmail = user?.email || undefined

    // Create Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: userEmail,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        scout_user_id: session.user.id,
        scout_name: profile.full_name || 'Scout',
      },
    })

    // Save Stripe account ID to scout's profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_account_id: account.id,
      })
      .eq('user_id', session.user.id)

    if (updateError) {
      console.error('Error updating profile with Stripe account ID:', updateError)
      return handleApiError(updateError, 'Failed to save account ID')
    }

    console.log(`✅ Created Stripe Connect account ${account.id} for scout ${session.user.id}`)

    return successResponse({
      success: true,
      accountId: account.id,
      message: 'Stripe Connect account created successfully',
      onboardingUrl: null, // Will need to get onboarding link separately
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to create Stripe Connect account')
  }
}
