import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isHighSchoolAdmin } from '@/lib/high-school/school'
import { calculateReferralBonus } from '@/lib/high-school/referral'
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

    // Calculate referral stats
    const stats = await calculateReferralBonus(params.id)

    // Get total referred schools count
    const supabase = createServerClient()
    const { data: referrals } = await supabase
      .from('school_referrals')
      .select('id, referred_school_id')
      .eq('referring_school_id', params.id)

    const totalReferred = referrals?.length || 0

    return successResponse({
      success: true,
      stats: {
        ...stats,
        totalReferred,
      },
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to get referral stats')
  }
}


