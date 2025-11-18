import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'
import { payReferralBonus } from '@/lib/high-school/referral'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

    const body = await request.json()
    const { decision } = body

    if (!decision || !['approved', 'denied'].includes(decision)) {
      return NextResponse.json(
        { error: 'Decision must be "approved" or "denied"' },
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

    // Get school details
    const { data: school } = await adminSupabase
      .from('high_schools')
      .select('id, name, referral_school_id, created_by')
      .eq('id', params.id)
      .maybeSingle()

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    // Update admin status
    const { error: updateError } = await adminSupabase
      .from('high_schools')
      .update({
        admin_status: decision,
        admin_reviewed_at: new Date().toISOString(),
        admin_reviewed_by: session.user.id,
      })
      .eq('id', params.id)

    if (updateError) {
      return handleApiError(updateError, 'Failed to update school status')
    }

    // If approved, process referral bonus if applicable
    if (decision === 'approved' && school.referral_school_id) {
      // Find referral record
      const { data: referral } = await adminSupabase
        .from('school_referrals')
        .select('id')
        .eq('referred_school_id', params.id)
        .eq('referring_school_id', school.referral_school_id)
        .eq('bonus_status', 'pending')
        .maybeSingle()

      if (referral) {
        // Pay referral bonus
        await payReferralBonus(referral.id)
        // Notification will be sent by payReferralBonus
      }
    }

    // Send notification to school admins
    const { data: admins } = await adminSupabase
      .from('high_school_admins')
      .select('user_id')
      .eq('high_school_id', params.id)

    if (admins) {
      for (const admin of admins) {
        // If there are multiple admins and one was reviewed, notify the other
        if (admins.length > 1 && admin.user_id !== school.created_by) {
          await createNotification({
            userId: admin.user_id,
            type: decision === 'approved' ? 'admin_accepted' : 'admin_denied',
            title: `School ${decision === 'approved' ? 'Approved' : 'Denied'}`,
            message: `Your high school page "${school.name}" has been ${decision} by admin review.`,
            link: `/high-school/${params.id}/settings`,
            metadata: {
              school_id: params.id,
              decision,
              reviewed_by: session.user.id,
            },
          })
        }
      }
    }

    return successResponse({
      success: true,
      decision,
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to process decision')
  }
}


