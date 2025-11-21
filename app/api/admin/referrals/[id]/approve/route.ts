import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/referrals/[id]/approve
 * Admin endpoint to approve a referral (changes status from pending to approved)
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

    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Update referral status to approved
    const { data: referral, error: updateError } = await adminSupabase
      .from('referrals')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error approving referral:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to approve referral' },
        { status: 500 }
      )
    }

    if (!referral) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      )
    }

    return successResponse({ 
      referral,
      message: 'Referral approved successfully' 
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to approve referral')
  }
}

