import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { profileId: string } }
) {
  try {
    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get the profile to find high_school_id and user_id
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('id, user_id, high_school_id, role')
      .eq('id', params.profileId)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // If no high_school_id, return empty
    if (!profile.high_school_id || !profile.user_id) {
      return NextResponse.json({
        highSchool: null,
        rosterData: null
      })
    }

    // Fetch high school info
    const { data: schoolData, error: schoolError } = await adminSupabase
      .from('high_schools')
      .select('name, username, logo_url')
      .eq('id', profile.high_school_id)
      .maybeSingle()

    // Fetch player roster data
    const { data: playerData, error: playerError } = await adminSupabase
      .from('high_school_players')
      .select('jersey_number, positions, graduation_month, graduation_year, request_status, joined_at, released_at')
      .eq('high_school_id', profile.high_school_id)
      .eq('user_id', profile.user_id)
      .is('released_at', null)
      .maybeSingle()

    return NextResponse.json({
      highSchool: schoolData || null,
      rosterData: playerData ? {
        jersey_number: playerData.jersey_number || null,
        positions: playerData.positions || null,
        graduation_month: playerData.graduation_month || null,
        graduation_year: playerData.graduation_year || null,
      } : null,
      debug: {
        profile: {
          high_school_id: profile.high_school_id,
          user_id: profile.user_id
        },
        schoolError: schoolError?.message,
        playerError: playerError?.message,
        playerDataFound: !!playerData
      }
    })
  } catch (error: any) {
    console.error('Error fetching roster data:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch roster data' },
      { status: 500 }
    )
  }
}


