import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isHighSchoolAdmin } from '@/lib/high-school/school'
import { createAdminClient } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function DELETE(
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

    // Get school and other admin before deletion
    const { data: school } = await adminSupabase
      .from('high_schools')
      .select('name')
      .eq('id', params.id)
      .maybeSingle()

    const { data: admins } = await adminSupabase
      .from('high_school_admins')
      .select('user_id')
      .eq('high_school_id', params.id)

    // Delete school (cascade will handle related records)
    const { error: deleteError } = await adminSupabase
      .from('high_schools')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      return handleApiError(deleteError, 'Failed to delete school')
    }

    // Notify other admin if exists
    if (admins) {
      const otherAdmin = admins.find(a => a.user_id !== session.user.id)
      if (otherAdmin && school) {
        await createNotification({
          userId: otherAdmin.user_id,
          type: 'school_deleted',
          title: 'High School Page Deleted',
          message: `The high school page "${school.name}" has been deleted.`,
          link: '/profile',
          metadata: {
            school_id: params.id,
            deleted_by: session.user.id,
          },
        })
      }
    }

    return successResponse({ success: true })
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete school')
  }
}


