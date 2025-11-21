import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * Creates a referral record when a new user signs up and selects a referrer.
 * Calculates the amount earned: $5 for scout referrals, $2 for player referrals.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

    const body = await request.json()
    const { referrer_id, referred_id, referred_role } = body

    if (!referrer_id || !referred_id || !referred_role) {
      return NextResponse.json(
        { error: 'Missing required fields: referrer_id, referred_id, referred_role' },
        { status: 400 }
      )
    }

    if (referrer_id === referred_id) {
      return NextResponse.json(
        { error: 'Cannot refer yourself' },
        { status: 400 }
      )
    }

    // Only allow player or scout roles
    if (referred_role !== 'player' && referred_role !== 'scout') {
      return NextResponse.json(
        { error: 'Referred role must be player or scout' },
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

    // Check if referrer has an approved referral application
    const { data: referrerApplication } = await adminSupabase
      .from('referral_applications')
      .select('status')
      .eq('user_id', referrer_id)
      .eq('status', 'approved')
      .maybeSingle()

    if (!referrerApplication) {
      return NextResponse.json(
        { error: 'Referrer is not approved for the referral program' },
        { status: 400 }
      )
    }

    // Get referrer's role from their profile
    const { data: referrerProfile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('user_id', referrer_id)
      .maybeSingle()

    if (!referrerProfile || (referrerProfile.role !== 'player' && referrerProfile.role !== 'scout')) {
      return NextResponse.json(
        { error: 'Referrer must be a player or scout' },
        { status: 400 }
      )
    }

    // Calculate amount earned: $5 for scout, $2 for player
    const amountEarned = referred_role === 'scout' ? 5.00 : 2.00

    // Check if referral already exists
    const { data: existingReferral } = await adminSupabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', referrer_id)
      .eq('referred_id', referred_id)
      .maybeSingle()

    if (existingReferral) {
      return NextResponse.json(
        { error: 'Referral already exists' },
        { status: 400 }
      )
    }

    // Create referral record
    const { data: referral, error: referralError } = await adminSupabase
      .from('referrals')
      .insert({
        referrer_id,
        referred_id,
        referrer_role: referrerProfile.role,
        referred_role,
        amount_earned: amountEarned,
        status: 'pending',
      })
      .select()
      .single()

    if (referralError) {
      return NextResponse.json(
        { error: referralError.message || 'Failed to create referral' },
        { status: 500 }
      )
    }

    return successResponse({ referral })
  } catch (error: any) {
    return handleApiError(error, 'Failed to create referral')
  }
}

