import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isHighSchoolAdmin } from '@/lib/high-school/school'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; inviteId: string } }
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

    // Check if invite exists and belongs to this school
    const { data: invite } = await adminSupabase
      .from('high_school_admin_invites')
      .select('id, high_school_id, status')
      .eq('id', params.inviteId)
      .eq('high_school_id', params.id)
      .single()

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      )
    }

    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invite is not pending' },
        { status: 400 }
      )
    }

    // Cancel the invite
    const { error: updateError } = await adminSupabase
      .from('high_school_admin_invites')
      .update({
        status: 'cancelled',
      })
      .eq('id', params.inviteId)

    if (updateError) {
      return handleApiError(updateError, 'Failed to cancel invite')
    }

    return successResponse({
      success: true,
      message: 'Invite cancelled successfully',
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to cancel invite')
  }
}


