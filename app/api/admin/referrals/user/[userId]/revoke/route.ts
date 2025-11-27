import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/referrals/user/[userId]/revoke
 * Admin revokes a user's referrer status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
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

    // Update referral application status to denied
    const { error: updateError } = await adminSupabase
      .from('referral_program_applications')
      .update({
        status: 'denied',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminResult.session.user.id,
      })
      .eq('user_id', params.userId)
      .eq('status', 'approved')

    if (updateError) {
      console.error('Error revoking referrer status:', updateError)
      return NextResponse.json(
        { error: 'Failed to revoke referrer status' },
        { status: 500 }
      )
    }

    return successResponse({
      message: 'Referrer status revoked successfully',
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to revoke referrer status')
  }
}


