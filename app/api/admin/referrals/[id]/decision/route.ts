import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isAdmin } from '@/lib/admin'
import { createAdminClient, getUserEmail } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications'
import {
  sendReferralApplicationApprovedEmail,
  sendReferralApplicationDeniedEmail,
} from '@/lib/email'

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

    const decisionStatus = action === 'approve' ? 'approved' : 'denied'

    // Fetch user email & profile for notifications
    const [userEmail, userProfileResult] = await Promise.all([
      getUserEmail(application.user_id),
      adminSupabase
        .from('profiles')
        .select('full_name, username')
        .eq('user_id', application.user_id)
        .maybeSingle(),
    ])

    const userProfile = userProfileResult.data
    const applicantName =
      userProfile?.full_name ||
      userProfile?.username ||
      application.user_id

    const notificationType =
      decisionStatus === 'approved'
        ? 'referral_application_approved'
        : 'referral_application_denied'

    try {
      await createNotification({
        userId: application.user_id,
        type: notificationType,
        title:
          decisionStatus === 'approved'
            ? 'Referral application approved'
            : 'Referral application denied',
        message:
          decisionStatus === 'approved'
            ? 'You are now approved for the referral program. Head to your profile to finish onboarding.'
            : 'Your referral program application was not approved. You can reapply once you meet the requirements.',
        link: '/make-money',
        metadata: {
          application_id: application.id,
          reviewed_at: updatedApplication.reviewed_at,
          status: decisionStatus,
        },
      })
    } catch (notificationError) {
      console.error('❌ Failed to create referral decision notification:', notificationError)
    }

    if (userEmail) {
      const emailPromise =
        decisionStatus === 'approved'
          ? sendReferralApplicationApprovedEmail({
              email: userEmail,
              name: applicantName,
            })
          : sendReferralApplicationDeniedEmail({
              email: userEmail,
              name: applicantName,
            })

      emailPromise.catch((emailError) => {
        console.error('❌ Failed to send referral decision email:', emailError)
      })
    }

    return successResponse({ 
      application: updatedApplication,
      message: `Application ${action === 'approve' ? 'approved' : 'denied'} successfully` 
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to update referral application')
  }
}

