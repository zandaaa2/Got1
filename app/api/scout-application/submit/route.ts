import { createRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendApplicationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient(() => cookieStore)

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      console.error('Error creating application:', applicationError)
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      )
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

    return NextResponse.json({ success: true, application })
  } catch (error: any) {
    console.error('Error submitting scout application:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

