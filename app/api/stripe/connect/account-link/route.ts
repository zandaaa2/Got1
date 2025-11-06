import { createRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

/**
 * Generates a Stripe Account Link for a scout to access their Connect account.
 * This link allows them to:
 * 1. Complete onboarding (if not done)
 * 2. View their dashboard
 * 3. Manage payouts
 * 
 * For Express accounts, scouts access their account via Stripe's hosted dashboard.
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

    // Get scout's profile to check for Stripe account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, role')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    if (profile.role !== 'scout') {
      return NextResponse.json(
        { error: 'Only scouts can access Stripe Connect accounts' },
        { status: 403 }
      )
    }

    if (!profile.stripe_account_id) {
      return NextResponse.json(
        { error: 'No Stripe Connect account found. Please contact support.' },
        { status: 404 }
      )
    }

    // Get the base URL for return links
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

    // Create an account link for the scout
    // This link allows them to access their Stripe Express dashboard
    const accountLink = await stripe.accountLinks.create({
      account: profile.stripe_account_id,
      refresh_url: `${baseUrl}/profile?stripe=refresh`,
      return_url: `${baseUrl}/profile?stripe=success`,
      type: 'account_onboarding', // For first-time onboarding
    })

    // Also create a login link for accessing the dashboard after onboarding
    const loginLink = await stripe.accounts.createLoginLink(profile.stripe_account_id)

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url, // Use this for first-time onboarding
      dashboardUrl: loginLink.url,    // Use this to access dashboard after onboarding
      accountId: profile.stripe_account_id,
    })
  } catch (error: any) {
    console.error('Error creating Stripe account link:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create account link' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check if scout has completed onboarding
 */
export async function GET(request: NextRequest) {
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

    // Get scout's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, role')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (!profile || profile.role !== 'scout') {
      return NextResponse.json({
        hasAccount: false,
        onboardingComplete: false,
      })
    }

    if (!profile.stripe_account_id) {
      return NextResponse.json({
        hasAccount: false,
        onboardingComplete: false,
      })
    }

    // Check account status
    try {
      const account = await stripe.accounts.retrieve(profile.stripe_account_id)
      
      // Express accounts are considered onboarded if they have charges enabled
      const onboardingComplete = account.charges_enabled === true

      return NextResponse.json({
        hasAccount: true,
        onboardingComplete,
        accountId: profile.stripe_account_id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      })
    } catch (stripeError: any) {
      console.error('Error retrieving Stripe account:', stripeError)
      return NextResponse.json({
        hasAccount: true,
        onboardingComplete: false,
        error: stripeError.message,
      })
    }
  } catch (error: any) {
    console.error('Error checking Stripe account status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check account status' },
      { status: 500 }
    )
  }
}

