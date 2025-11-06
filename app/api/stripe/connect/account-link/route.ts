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
    console.log('📧 Creating Stripe account link...')
    
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient(() => cookieStore)
    
    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      console.error('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📧 User ID:', session.user.id)

    // Get scout's profile to check for Stripe account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, role')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileError.message },
        { status: 500 }
      )
    }

    if (!profile) {
      console.error('❌ Profile not found for user:', session.user.id)
      return NextResponse.json(
        { error: 'Profile not found. Please complete your profile setup first.' },
        { status: 404 }
      )
    }

    if (profile.role !== 'scout') {
      console.error('❌ User is not a scout:', profile.role)
      return NextResponse.json(
        { error: 'Only scouts can access Stripe Connect accounts' },
        { status: 403 }
      )
    }

    if (!profile.stripe_account_id) {
      console.error('❌ No Stripe account ID found')
      return NextResponse.json(
        { error: 'No Stripe Connect account found. Please create one first.' },
        { status: 404 }
      )
    }

    console.log('📧 Stripe account ID:', profile.stripe_account_id)

    // Get the base URL for return links
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    console.log('📧 Base URL:', baseUrl)

    // Check account status to determine if we need onboarding or dashboard link
    let accountLink
    let loginLink
    let needsOnboarding = false
    let chargesEnabled = false
    let onboardingComplete = false

    try {
      const account = await stripe.accounts.retrieve(profile.stripe_account_id)
      chargesEnabled = account.charges_enabled === true
      const detailsSubmitted = account.details_submitted === true
      // Onboarding is complete if charges enabled OR details submitted
      onboardingComplete = chargesEnabled || detailsSubmitted
      needsOnboarding = !onboardingComplete
      console.log('📧 Account charges enabled:', chargesEnabled)
      console.log('📧 Account details submitted:', detailsSubmitted)
      console.log('📧 Onboarding complete:', onboardingComplete)
      console.log('📧 Needs onboarding:', needsOnboarding)
    } catch (stripeError: any) {
      console.error('❌ Error retrieving account:', stripeError)
      // Assume onboarding is needed if we can't retrieve account
      needsOnboarding = true
      onboardingComplete = false
    }

    // Create an account link for onboarding (if needed)
    if (needsOnboarding) {
      console.log('📧 Creating onboarding link...')
      accountLink = await stripe.accountLinks.create({
        account: profile.stripe_account_id,
        refresh_url: `${baseUrl}/profile?stripe=refresh`,
        return_url: `${baseUrl}/profile?stripe=success`,
        type: 'account_onboarding',
      })
      console.log('✅ Onboarding link created:', accountLink.url)
    }

    // Only create a login link if onboarding is complete (charges enabled OR details submitted)
    if (onboardingComplete) {
      console.log('📧 Creating login link (onboarding complete)...')
      try {
        loginLink = await stripe.accounts.createLoginLink(profile.stripe_account_id)
        console.log('✅ Login link created:', loginLink.url)
      } catch (loginError: any) {
        console.error('❌ Error creating login link:', loginError)
        // If login link fails but onboarding is complete, still return onboarding URL as fallback
        if (accountLink) {
          console.log('⚠️ Using onboarding link as fallback')
        }
      }
    }

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink?.url || null, // Use this for first-time onboarding
      dashboardUrl: loginLink?.url || null,    // Use this to access dashboard after onboarding
      accountId: profile.stripe_account_id,
      onboardingComplete: chargesEnabled,
    })
  } catch (error: any) {
    console.error('❌ Error creating Stripe account link:', error)
    console.error('❌ Error stack:', error.stack)
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
      
      console.log('📧 Account status:', {
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
      })
      
      // Express accounts are considered onboarded if:
      // 1. Charges are enabled, OR
      // 2. Details are submitted (even if charges not yet enabled)
      const onboardingComplete = account.charges_enabled === true || account.details_submitted === true

      return NextResponse.json({
        hasAccount: true,
        onboardingComplete,
        accountId: profile.stripe_account_id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      })
    } catch (stripeError: any) {
      console.error('❌ Error retrieving Stripe account:', stripeError)
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

