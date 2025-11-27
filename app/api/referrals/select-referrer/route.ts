import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'

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

    // Check if referral already exists for this user (with any referrer)
    // This prevents duplicate referrals even if they try to select a different referrer
    // Use .limit(1) to ensure we get the first one if duplicates exist
    const { data: existingReferrals } = await adminSupabase
      .from('referrals')
      .select('id, referrer_id')
      .eq('referred_id', session.user.id)
      .limit(1)
    
    const existingReferral = existingReferrals && existingReferrals.length > 0 ? existingReferrals[0] : null

    if (existingReferral) {
      console.log('⚠️ Referral already exists for user:', session.user.id, 'with referrer:', existingReferral.referrer_id)
      return NextResponse.json(
        { 
          error: 'You have already selected a referrer. Each user can only have one referral.',
          existingReferralId: existingReferral.id
        },
        { status: 400 }
      )
    }

    // Create referral record with pending_admin_review status
    // Admin will manually review and process payment ($45, $65, or $125) after verifying onboarding completion
    const { data: referral, error: insertError } = await adminSupabase
      .from('referrals')
      .insert({
        referrer_id: referrer_id,
        referred_id: session.user.id,
        referrer_role: referrerProfile.role,
        referred_role: referred_role,
        amount_earned: 0, // Will be set by admin when processing payment
        payment_status: 'pending_admin_review', // Admin will review and process payment
        payment_amount: null, // Will be set by admin ($45, $65, or $125)
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
      message: 'Referral recorded successfully! Payment will be processed by admin after onboarding verification.' 
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to create referral')
  }
}

