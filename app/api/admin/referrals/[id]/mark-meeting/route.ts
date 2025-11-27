import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/referrals/[id]/mark-meeting
 * Admin marks a Calendly meeting as completed for a referral application
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminResult = await requireAdmin(request)
    if (adminResult.response) {
      return adminResult.response
    }

    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get the application
    const { data: application, error: fetchError } = await adminSupabase
      .from('referral_program_applications')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Update meeting status
    const { data: updatedApplication, error: updateError } = await adminSupabase
      .from('referral_program_applications')
      .update({
        calendly_meeting_completed: true,
        calendly_meeting_date: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating meeting status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update meeting status' },
        { status: 500 }
      )
    }

    return successResponse({
      application: updatedApplication,
      message: 'Meeting marked as completed',
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to mark meeting as completed')
  }
}

