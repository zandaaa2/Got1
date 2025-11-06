import { createRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

/**
 * Creates a Stripe Connect account for the current user (if they're a scout).
 * This can be used to manually create accounts for existing scouts.
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

    // Get scout profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, role, full_name, user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileError.message },
        { status: 500 }
      )
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
      return NextResponse.json(
        { error: 'Failed to save account ID', details: updateError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Created Stripe Connect account ${account.id} for scout ${session.user.id}`)

    return NextResponse.json({
      success: true,
      accountId: account.id,
      message: 'Stripe Connect account created successfully',
      onboardingUrl: null, // Will need to get onboarding link separately
    })
  } catch (error: any) {
    console.error('Error creating Stripe Connect account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create Stripe Connect account' },
      { status: 500 }
    )
  }
}
