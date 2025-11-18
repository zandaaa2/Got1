import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isHighSchoolAdmin } from '@/lib/high-school/school'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Get the user_id to remove from request body
    const body = await request.json()
    const { user_id: userIdToRemove } = body

    if (!userIdToRemove) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Cannot remove yourself (use leave endpoint instead)
    if (userIdToRemove === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself. Use the leave endpoint instead.' },
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

    // Check if the user to remove is actually an admin
    const { data: adminToRemove } = await adminSupabase
      .from('high_school_admins')
      .select('user_id')
      .eq('high_school_id', params.id)
      .eq('user_id', userIdToRemove)
      .single()

    if (!adminToRemove) {
      return NextResponse.json(
        { error: 'User is not an admin of this school' },
        { status: 404 }
      )
    }

    // Check if there are other admins (excluding players and the one being removed)
    const { data: allAdmins } = await adminSupabase
      .from('high_school_admins')
      .select(`
        user_id,
        profile:profiles!high_school_admins_user_id_fkey(role)
      `)
      .eq('high_school_id', params.id)

    // Filter out players and the user being removed from admin count
    const nonPlayerAdmins = (allAdmins || []).filter(
      admin => admin.profile?.role !== 'player' && admin.user_id !== userIdToRemove
    )

    // Also check if the creator is being removed - if so, we need at least one other admin
    const { data: school } = await adminSupabase
      .from('high_schools')
      .select('created_by')
      .eq('id', params.id)
      .single()

    // If removing the creator, ensure there's at least one other admin
    if (school?.created_by === userIdToRemove && nonPlayerAdmins.length === 0) {
      return NextResponse.json(
        { error: 'Cannot remove the creator: You must add another admin before removing the creator' },
        { status: 400 }
      )
    }

    // If this would leave no admins, prevent removal
    if (nonPlayerAdmins.length === 0) {
      return NextResponse.json(
        { error: 'Cannot remove: This would leave the school with no admins. Add another admin first.' },
        { status: 400 }
      )
    }

    // Remove admin
    const { error: deleteError } = await adminSupabase
      .from('high_school_admins')
      .delete()
      .eq('high_school_id', params.id)
      .eq('user_id', userIdToRemove)

    if (deleteError) {
      return handleApiError(deleteError, 'Failed to remove admin')
    }

    return successResponse({
      success: true,
      message: 'Admin removed successfully',
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to remove admin')
  }
}


