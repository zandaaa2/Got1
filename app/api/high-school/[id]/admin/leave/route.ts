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

    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Check if there are other admins (excluding players)
    const { data: allAdmins } = await adminSupabase
      .from('high_school_admins')
      .select(`
        user_id,
        profile:profiles!high_school_admins_user_id_fkey(role)
      `)
      .eq('high_school_id', params.id)

    // Filter out players from admin count
    const nonPlayerAdmins = (allAdmins || []).filter(admin => admin.profile?.role !== 'player')

    if (!nonPlayerAdmins || nonPlayerAdmins.length <= 1) {
      return NextResponse.json(
        { error: 'Cannot leave: You must add another admin before leaving' },
        { status: 400 }
      )
    }

    // Remove admin
    const { error: deleteError } = await adminSupabase
      .from('high_school_admins')
      .delete()
      .eq('high_school_id', params.id)
      .eq('user_id', session.user.id)

    if (deleteError) {
      return handleApiError(deleteError, 'Failed to leave school')
    }

    return successResponse({
      success: true,
      message: 'Successfully left school page',
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to leave school')
  }
}


