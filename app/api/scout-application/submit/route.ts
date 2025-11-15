import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { sendApplicationEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const body = await request.json()
    const { current_workplace, current_position, work_history, additional_info } = body

    if (!current_workplace || !current_position || !work_history) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role === 'scout') {
      return NextResponse.json({ error: 'Already a scout' }, { status: 400 })
    }

    // Check for existing pending application
    const { data: existingApplication } = await supabase
      .from('scout_applications')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'pending')
      .single()

    if (existingApplication) {
      return NextResponse.json(
        { error: 'Application already pending' },
        { status: 400 }
      )
    }

    // Create scout application
    const { data: application, error: applicationError } = await supabase
      .from('scout_applications')
      .insert({
        user_id: session.user.id,
        current_workplace,
        current_position,
        work_history,
        additional_info: additional_info || null,
        status: 'pending',
      })
      .select()
      .single()

    if (applicationError || !application) {
      return handleApiError(applicationError, 'Failed to submit application')
    }

    // Create notification for user that their application was received
    try {
      console.log('📧 Creating scout_application_received notification for user:', session.user.id)
      
      const notificationCreated = await createNotification({
        userId: session.user.id,
        type: 'scout_application_received',
        title: 'Application Received',
        message: 'We\'ve received your scout application and will review it shortly. You\'ll be notified once a decision has been made.',
        link: '/profile',
        metadata: {
          application_id: application.id,
          submitted_at: new Date().toISOString(),
        },
      })

      if (notificationCreated) {
        console.log('✅ Application received notification created for user:', session.user.id)
      } else {
        console.error('❌ Failed to create application received notification - createNotification returned false')
      }
    } catch (notificationError: any) {
      console.error('❌ Error creating application received notification:', notificationError)
      console.error('❌ Notification error details:', {
        message: notificationError?.message,
        stack: notificationError?.stack,
        error: JSON.stringify(notificationError, Object.getOwnPropertyNames(notificationError)),
      })
      // Don't fail the request if notification fails
    }

    // Get user email for the email notification
    const { data: { user } } = await supabase.auth.getUser()

    // Send email notification to admin
    try {
      await sendApplicationEmail(profile, application, user?.email || null)
    } catch (emailError) {
      console.error('Error sending email:', emailError)
      // Don't fail the request if email fails
    }

    return successResponse({ success: true, application })
  } catch (error: any) {
    return handleApiError(error, 'Internal server error')
  }
}

