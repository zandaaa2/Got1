import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get player's roster record
    const { data: playerRecord } = await adminSupabase
      .from('high_school_players')
      .select('id, high_school_id, release_requested_at')
      .eq('user_id', session.user.id)
      .is('released_at', null)
      .maybeSingle()

    if (!playerRecord) {
      return NextResponse.json(
        { error: 'You are not on a school roster' },
        { status: 400 }
      )
    }

    // Check if already requested
    if (playerRecord.release_requested_at) {
      return NextResponse.json(
        { error: 'Release already requested' },
        { status: 400 }
      )
    }

    // Update record
    await adminSupabase
      .from('high_school_players')
      .update({ release_requested_at: new Date().toISOString() })
      .eq('id', playerRecord.id)

    // Get school and admins
    const { data: school } = await adminSupabase
      .from('high_schools')
      .select('name, username')
      .eq('id', playerRecord.high_school_id)
      .single()

    const { data: admins } = await adminSupabase
      .from('high_school_admins')
      .select('user_id')
      .eq('high_school_id', playerRecord.high_school_id)

    // Get player profile
    const { data: playerProfile } = await adminSupabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', session.user.id)
      .single()

    // Notify admins
    if (admins) {
      for (const admin of admins) {
        await createNotification({
          userId: admin.user_id,
          type: 'player_release_request',
          title: 'Player Release Request',
          message: `${playerProfile?.full_name || 'A player'} has requested to be released from ${school?.name || 'the roster'}.`,
          link: school?.username ? `/high-school/${school.username}/roster` : `/high-school/${playerRecord.high_school_id}/roster`,
          metadata: {
            player_id: session.user.id,
            school_id: playerRecord.high_school_id,
          },
        })
      }
    }

    return successResponse({ success: true })
  } catch (error: any) {
    return handleApiError(error, 'Failed to request release')
  }
}
