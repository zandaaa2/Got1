import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'

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
    
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    console.log('📧 User ID:', session.user.id)

    // Get scout's profile to check for Stripe account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, role')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError)
      return handleApiError(profileError, 'Failed to fetch profile')
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

    // Check if Stripe setup was bypassed manually
    if (profile.stripe_account_id === 'bypass_manual_setup') {
      console.log('📧 Stripe setup bypassed for user:', session.user.id)
      return successResponse({
        success: true,
        onboardingUrl: null,
        dashboardUrl: null,
        accountId: 'bypass_manual_setup',
        onboardingComplete: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        bypassed: true,
      })
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
    let payoutsEnabled = false
    let requirementsDue: string[] = []
    let requirementsPastDue: string[] = []
    let requirementsReason: string | null = null
    let accountExists = false

    try {
      const account = await stripe.accounts.retrieve(profile.stripe_account_id)
      accountExists = true
      chargesEnabled = account.charges_enabled === true
      payoutsEnabled = account.payouts_enabled === true
      const detailsSubmitted = account.details_submitted === true
      // Onboarding is complete if charges enabled OR details submitted
      onboardingComplete = chargesEnabled || detailsSubmitted
      needsOnboarding = !onboardingComplete
      requirementsDue = account.requirements?.currently_due || []
      requirementsPastDue = account.requirements?.past_due || []
      requirementsReason = account.requirements?.disabled_reason || null
      console.log('📧 Account charges enabled:', chargesEnabled)
      console.log('📧 Account details submitted:', detailsSubmitted)
      console.log('📧 Onboarding complete:', onboardingComplete)
      console.log('📧 Needs onboarding:', needsOnboarding)
    } catch (stripeError: any) {
      console.error('❌ Error retrieving account:', stripeError)
      
      // If account doesn't exist or isn't connected, check if it's a key mismatch
      if (stripeError.code === 'resource_missing' || stripeError.statusCode === 404 || 
          stripeError.message?.includes('not connected') || stripeError.message?.includes('does not exist')) {
        console.log('📧 Account retrieval failed - could be missing account or key mismatch')
        
        // Check if we're using test keys (development) - if so, don't clear account ID
        // as it might be a valid account in a different environment (test vs live)
        const isTestKey = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
        const isDevelopment = process.env.NODE_ENV === 'development' || 
                             process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')
        
        // Only clear account ID in production, and only if we're certain it's invalid
        // In development, preserve the account ID as it might be valid in a different environment
        if (!isDevelopment && !isTestKey) {
          console.log('📧 Production environment - clearing invalid account ID...')
          await supabase
            .from('profiles')
            .update({ stripe_account_id: null })
            .eq('user_id', session.user.id)
        } else {
          console.log('📧 Development/test environment - preserving account ID (may be valid in different environment)')
        }
        
        return NextResponse.json(
          { 
            error: isDevelopment 
              ? 'Stripe account not accessible. This may be due to using test keys with a live account (or vice versa). Please ensure your Stripe keys match your account environment.'
              : 'Stripe account not found. Please create a new Stripe Connect account.',
            accountNotFound: true
          },
          { status: 404 }
        )
      }
      
      // For other errors, assume onboarding is needed but don't try to create link
      needsOnboarding = true
      onboardingComplete = false
      accountExists = false
    }

    // Only create account links if the account actually exists
    if (!accountExists) {
      return NextResponse.json(
        { 
          error: 'Unable to access Stripe account. Please try creating a new account.',
          accountNotFound: true
        },
        { status: 404 }
      )
    }

    // Create an account link for onboarding (if needed)
    if (needsOnboarding) {
      console.log('📧 Creating onboarding link...')
      try {
        accountLink = await stripe.accountLinks.create({
          account: profile.stripe_account_id,
          refresh_url: `${baseUrl}/profile?stripe=refresh`,
          return_url: `${baseUrl}/profile?stripe=success`,
          type: 'account_onboarding',
        })
        console.log('✅ Onboarding link created:', accountLink.url)
      } catch (linkError: any) {
        console.error('❌ Error creating account link:', linkError)
        
        // If account link creation fails because account doesn't exist, check environment
        if (linkError.code === 'resource_missing' || linkError.message?.includes('not connected')) {
          const isTestKey = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
          const isDevelopment = process.env.NODE_ENV === 'development' || 
                               process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')
          
          // Only clear account ID in production
          if (!isDevelopment && !isTestKey) {
            console.log('📧 Production environment - clearing invalid account ID from link error...')
            await supabase
              .from('profiles')
              .update({ stripe_account_id: null })
              .eq('user_id', session.user.id)
          }
          
          return NextResponse.json(
            { 
              error: isDevelopment 
                ? 'Stripe account not accessible. This may be due to using test keys with a live account (or vice versa). Please ensure your Stripe keys match your account environment.'
                : 'Stripe account not found. Please create a new Stripe Connect account.',
              accountNotFound: true
            },
            { status: 404 }
          )
        }
        
        // Re-throw other errors
        throw linkError
      }
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

    return successResponse({
      success: true,
      onboardingUrl: accountLink?.url || null, // Use this for first-time onboarding
      dashboardUrl: loginLink?.url || null,    // Use this to access dashboard after onboarding
      accountId: profile.stripe_account_id,
      onboardingComplete,
      chargesEnabled,
      payoutsEnabled,
      requirementsDue,
      requirementsPastDue,
      requirementsReason,
    })
  } catch (error: any) {
    console.error('❌ Error creating Stripe account link:', error)
    return handleApiError(error, 'Failed to create account link')
  }
}

/**
 * GET endpoint to check if scout has completed onboarding
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

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

    // Check if Stripe setup was bypassed manually
    if (profile.stripe_account_id === 'bypass_manual_setup') {
      return NextResponse.json({
        hasAccount: true,
        onboardingComplete: true,
        accountId: 'bypass_manual_setup',
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        bypassed: true,
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
        requirementsDue: account.requirements?.currently_due || [],
        requirementsPastDue: account.requirements?.past_due || [],
        requirementsReason: account.requirements?.disabled_reason || null,
      })
    } catch (stripeError: any) {
      console.error('❌ Error retrieving Stripe account:', stripeError)
      
      // If account doesn't exist or isn't connected, check environment
      if (stripeError.code === 'resource_missing' || stripeError.statusCode === 404 || 
          stripeError.message?.includes('not connected') || stripeError.message?.includes('does not exist')) {
        console.log('📧 Account retrieval failed (GET) - could be missing account or key mismatch')
        
        const isTestKey = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
        const isDevelopment = process.env.NODE_ENV === 'development' || 
                             process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')
        
        // Only clear account ID in production
        if (!isDevelopment && !isTestKey) {
          console.log('📧 Production environment - clearing invalid account ID...')
          await supabase
            .from('profiles')
            .update({ stripe_account_id: null })
            .eq('user_id', session.user.id)
        } else {
          console.log('📧 Development/test environment - preserving account ID (may be valid in different environment)')
        }
        
        return NextResponse.json({
          hasAccount: false,
          onboardingComplete: false,
          accountNotFound: true,
        })
      }
      
      return NextResponse.json({
        hasAccount: true,
        onboardingComplete: false,
        error: stripeError.message,
      })
    }
  } catch (error: any) {
    return handleApiError(error, 'Failed to check account status')
  }
}

