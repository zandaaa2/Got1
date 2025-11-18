import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isHighSchoolAdmin } from '@/lib/high-school/school'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
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

    // Get referred schools list
    const supabase = createServerClient()
    const { data: referrals, error } = await supabase
      .from('school_referrals')
      .select(`
        id,
        bonus_amount,
        bonus_status,
        bonus_paid_at,
        referred_school:high_schools!school_referrals_referred_school_id_fkey(
          id,
          username,
          name,
          admin_status
        )
      `)
      .eq('referring_school_id', params.id)
      .order('created_at', { ascending: false })

    if (error) {
      return handleApiError(error, 'Failed to get referred schools')
    }

    return successResponse({
      success: true,
      referrals: referrals || [],
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to get referred schools')
  }
}


