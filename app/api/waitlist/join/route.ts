import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-helpers'

/**
 * API endpoint to join a scout's waitlist
 * POST /api/waitlist/join
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const body = await request.json()
    const { scoutProfileId } = body

    if (!scoutProfileId) {
      return NextResponse.json(
        { error: 'Missing scoutProfileId' },
        { status: 400 }
      )
    }

    // Verify the scout profile exists
    const { data: scoutProfile, error: scoutError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', scoutProfileId)
      .eq('role', 'scout')
      .maybeSingle()

    if (scoutError || !scoutProfile) {
      return NextResponse.json(
        { error: 'Invalid scout profile' },
        { status: 404 }
      )
    }

    // Check if already on waitlist
    const { data: existing } = await supabase
      .from('scout_waitlist')
      .select('id')
      .eq('scout_profile_id', scoutProfileId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Already on waitlist', alreadyJoined: true },
        { status: 400 }
      )
    }

    // Get user's profile for name/email
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', session.user.id)
      .maybeSingle()

    const { data: { user } } = await supabase.auth.getUser()

    // Join waitlist
    const { error: insertError } = await supabase
      .from('scout_waitlist')
      .insert({
        scout_profile_id: scoutProfileId,
        user_id: session.user.id,
        email: user?.email || null,
        full_name: userProfile?.full_name || user?.user_metadata?.full_name || null,
      })

    if (insertError) {
      console.error('Error joining waitlist:', insertError)
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in waitlist join API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


