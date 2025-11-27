import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/referrals/check
 * Check if the current user has an existing referral
 */
export async function GET(request: NextRequest) {
  try {
    // Get user session using server client
    const supabase = createServerClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized', hasReferral: false },
        { status: 401 }
      )
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      // Fallback to regular client (should work with RLS policy)
      const { data: referral } = await supabase
        .from('referrals')
        .select('id, referrer_id, referred_id, created_at')
        .eq('referred_id', session.user.id)
        .maybeSingle()

      return NextResponse.json({
        hasReferral: !!referral,
        referral: referral || null,
        userId: session.user.id,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      })
    }

    // Use admin client
    const { data: referral, error: referralError } = await adminSupabase
      .from('referrals')
      .select('id, referrer_id, referred_id, created_at')
      .eq('referred_id', session.user.id)
      .maybeSingle()

    if (referralError) {
      console.error('Error checking referral:', referralError)
      return NextResponse.json(
        { error: 'Failed to check referral', hasReferral: false },
        { status: 500 }
      )
    }

    return NextResponse.json({
      hasReferral: !!referral,
      referral: referral || null,
      userId: session.user.id,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error: any) {
    console.error('Error in referral check:', error)
    return NextResponse.json(
      { error: 'Internal server error', hasReferral: false },
      { status: 500 }
    )
  }
}

