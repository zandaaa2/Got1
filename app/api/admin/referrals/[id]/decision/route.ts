import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/referrals/[id]/decision
 * Admin endpoint to approve or deny a referral application
 */
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

    // Check if user is admin
    const userIsAdmin = await isAdmin(session.user.id)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const { action } = await request.json()
    if (!action || !['approve', 'deny'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "deny"' },
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

    // Update application status
    const { data: updatedApplication, error: updateError } = await adminSupabase
      .from('referral_program_applications')
      .update({
        status: action === 'approve' ? 'approved' : 'denied',
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.id,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating referral application:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update application' },
        { status: 500 }
      )
    }

    return successResponse({ 
      application: updatedApplication,
      message: `Application ${action === 'approve' ? 'approved' : 'denied'} successfully` 
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to update referral application')
  }
}

