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
    // Check if Stripe key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY environment variable is not set')
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' },
        { status: 500 }
      )
    }
    
    // Log key type for debugging (without exposing the actual key)
    const keyType = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'test' : 
                    process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'live' : 'unknown'
    console.log(`📧 Using Stripe ${keyType} key`)
    
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
    console.error('❌ Stripe account creation error:', error)
    
    // Check if it's a Stripe API error
    if (error.type === 'StripeInvalidRequestError' || error.type === 'StripeAPIError') {
      console.error('Stripe API Error Details:', {
        type: error.type,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      })
      
      // Provide more specific error messages
      if (error.code === 'api_key_expired' || error.message?.includes('Invalid API Key')) {
        return NextResponse.json(
          { 
            error: 'Invalid Stripe API key. Please check your STRIPE_SECRET_KEY environment variable.',
            details: 'The Stripe secret key may be incorrect, expired, or missing.'
          },
          { status: 500 }
        )
      }
      
      if (error.message?.includes('test') || error.message?.includes('live')) {
        return NextResponse.json(
          { 
            error: 'Stripe key mismatch. You may be using a test key with a live account (or vice versa).',
            details: error.message
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { 
          error: `Stripe API error: ${error.message || 'Failed to create Stripe Connect account'}`,
          details: error.code ? `Error code: ${error.code}` : undefined
        },
        { status: error.statusCode || 500 }
      )
    }
    
    return handleApiError(error, 'Failed to create Stripe Connect account')
  }
}
