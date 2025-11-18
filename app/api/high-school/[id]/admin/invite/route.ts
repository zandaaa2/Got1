import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isHighSchoolAdmin } from '@/lib/high-school/school'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendAdminInviteEmail } from '@/lib/email/high-school-invite'

export const dynamic = 'force-dynamic'

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

    // Check if user is admin of this school
    const isAdmin = await isHighSchoolAdmin(session.user.id, params.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be an admin of this school' },
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

    const body = await request.json()
    const { email, user_id } = body

    if (!email && !user_id) {
      return NextResponse.json(
        { error: 'Email or user_id is required' },
        { status: 400 }
      )
    }

    let targetEmail: string | null = null
    let targetUserId: string | null = null

    // If user_id provided, get email from auth.users
    if (user_id) {
      targetUserId = user_id
      try {
        const { data: { user }, error: userError } = await adminSupabase.auth.admin.getUserById(user_id)
        if (userError || !user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          )
        }
        targetEmail = user.email || null
        if (!targetEmail) {
          return NextResponse.json(
            { error: 'User does not have an email address' },
            { status: 400 }
          )
        }
      } catch (err) {
        return NextResponse.json(
          { error: 'Failed to fetch user information' },
          { status: 500 }
        )
      }
    } else {
      targetEmail = email.trim().toLowerCase()
    }

    // Check if already 2 admins
    const { data: existingAdmins } = await adminSupabase
      .from('high_school_admins')
      .select('user_id')
      .eq('high_school_id', params.id)

    if (existingAdmins && existingAdmins.length >= 2) {
      return NextResponse.json(
        { error: 'Maximum of 2 admins allowed per school' },
        { status: 400 }
      )
    }

    // Check if user already admin
    if (targetUserId) {
      // Check if already admin
      const { data: existingAdmin } = await adminSupabase
        .from('high_school_admins')
        .select('id')
        .eq('high_school_id', params.id)
        .eq('user_id', targetUserId)
        .maybeSingle()

      if (existingAdmin) {
        return NextResponse.json(
          { error: 'User is already an admin of this school' },
          { status: 400 }
        )
      }
    } else if (targetEmail) {
      // Try to find user by email in auth.users
      try {
        const { data: { users } } = await adminSupabase.auth.admin.listUsers()
        const matchingUser = users.find(u => u.email?.toLowerCase() === targetEmail?.toLowerCase())
        
        if (matchingUser) {
          // Check if already admin
          const { data: existingAdmin } = await adminSupabase
            .from('high_school_admins')
            .select('id')
            .eq('high_school_id', params.id)
            .eq('user_id', matchingUser.id)
            .maybeSingle()

          if (existingAdmin) {
            return NextResponse.json(
              { error: 'User is already an admin of this school' },
              { status: 400 }
            )
          }
        }
      } catch (err) {
        // If we can't check, continue - email invite will be sent anyway
        console.error('Error checking existing user:', err)
      }
    }

    // Generate invite token
    const inviteToken = crypto.randomUUID()

    // Get school name
    const { data: school } = await adminSupabase
      .from('high_schools')
      .select('name')
      .eq('id', params.id)
      .maybeSingle()

    // Store invite in database
    const { error: inviteError } = await adminSupabase
      .from('high_school_admin_invites')
      .insert({
        high_school_id: params.id,
        email: targetEmail!,
        user_id: targetUserId || null,
        invite_token: inviteToken,
        invited_by: session.user.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })

    if (inviteError) {
      console.error('Error storing admin invite:', inviteError)
      return NextResponse.json(
        { error: 'Failed to store invite' },
        { status: 500 }
      )
    }

    // Send invite email
    await sendAdminInviteEmail({
      email: targetEmail!,
      schoolName: school?.name || 'High School',
      schoolId: params.id,
      inviteToken,
      invitedBy: session.user.id,
    })

    return successResponse({
      success: true,
      message: 'Admin invite sent successfully',
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to send admin invite')
  }
}

