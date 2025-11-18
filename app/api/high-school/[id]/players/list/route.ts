import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isHighSchoolAdmin } from '@/lib/high-school/school'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

    const isAdmin = await isHighSchoolAdmin(session.user.id, params.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be an admin of this school' },
        { status: 403 }
      )
    }

    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { data: players, error } = await adminSupabase
      .from('high_school_players')
      .select(`
        id,
        high_school_id,
        name,
        positions,
        email,
        username,
        user_id,
        graduation_month,
        graduation_year,
        jersey_number,
        invite_sent_at,
        joined_at,
        released_at,
        release_requested_at,
        request_status,
        requested_at,
        added_by,
        created_at,
        profiles:profiles!high_school_players_user_id_fkey(
          id,
          full_name,
          avatar_url,
          username
        )
      `)
      .eq('high_school_id', params.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return successResponse({
      success: true,
      players: players || [],
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch roster players')
  }
}


