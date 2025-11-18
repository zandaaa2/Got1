import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * Accept admin invite (called after user signs up via invite link)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

    // For now, admin invites are handled via email link
    // The token should contain school_id encoded or we need an invites table
    // For MVP, we'll require schoolId in the request body
    const body = await request.json()
    const { schoolId } = body

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
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

    // Check if already admin
    const { data: existingAdmin } = await adminSupabase
      .from('high_school_admins')
      .select('id')
      .eq('high_school_id', schoolId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'You are already an admin of this school' },
        { status: 400 }
      )
    }

    // Check if already 2 admins
    const { data: existingAdmins } = await adminSupabase
      .from('high_school_admins')
      .select('user_id')
      .eq('high_school_id', schoolId)

    if (existingAdmins && existingAdmins.length >= 2) {
      return NextResponse.json(
        { error: 'Maximum of 2 admins allowed per school' },
        { status: 400 }
      )
    }

    // Add as admin
    const { error: insertError } = await adminSupabase
      .from('high_school_admins')
      .insert({
        high_school_id: schoolId,
        user_id: session.user.id,
        invited_by: null, // Could track this if needed
      })

    if (insertError) {
      return handleApiError(insertError, 'Failed to accept admin invite')
    }

    // Notify other admin
    const { data: otherAdmin } = await adminSupabase
      .from('high_school_admins')
      .select('user_id')
      .eq('high_school_id', schoolId)
      .neq('user_id', session.user.id)
      .maybeSingle()

    if (otherAdmin) {
      await createNotification({
        userId: otherAdmin.user_id,
        type: 'admin_accepted',
        title: 'New Admin Added',
        message: 'A new admin has been added to your school.',
        link: `/high-school/${schoolId}/settings`,
        metadata: {
          school_id: schoolId,
          new_admin_id: session.user.id,
        },
      })
    }

    return successResponse({
      success: true,
      schoolId,
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to accept admin invite')
  }
}


