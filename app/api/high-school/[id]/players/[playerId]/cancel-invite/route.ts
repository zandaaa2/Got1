import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isHighSchoolAdmin } from '@/lib/high-school/school'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; playerId: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

    // Check if user is admin of this school
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

    // Get the player record
    const { data: playerRecord } = await adminSupabase
      .from('high_school_players')
      .select('id, request_status, user_id, joined_at')
      .eq('id', params.playerId)
      .eq('high_school_id', params.id)
      .maybeSingle()

    if (!playerRecord) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    // Only allow canceling if it's a pending request (not yet accepted/joined)
    if (playerRecord.joined_at) {
      return NextResponse.json(
        { error: 'Cannot cancel - player has already joined' },
        { status: 400 }
      )
    }

    if (playerRecord.request_status && playerRecord.request_status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only cancel pending requests' },
        { status: 400 }
      )
    }

    // Delete the pending request/invite
    const { error: deleteError } = await adminSupabase
      .from('high_school_players')
      .delete()
      .eq('id', params.playerId)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'Failed to cancel invite' },
        { status: 500 }
      )
    }

    return successResponse({ success: true })
  } catch (error: any) {
    return handleApiError(error, 'Failed to cancel invite')
  }
}


