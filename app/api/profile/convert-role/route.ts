import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
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
    const { newRole, password } = body

    // Validate role
    if (!newRole || !['user', 'player', 'scout', 'parent'].includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be user, player, scout, or parent' },
        { status: 400 }
      )
    }

    // Verify password for security
    if (password) {
      const { error: passwordError } = await supabase.auth.signInWithPassword({
        email: session.user.email!,
        password: password,
      })

      if (passwordError) {
        return NextResponse.json(
          { error: 'Incorrect password. Please try again.' },
          { status: 401 }
        )
      }
    } else {
      // For users without password (OAuth), we'll allow conversion but log it
      // In production, you might want to require additional verification
      console.log('Role conversion without password verification for OAuth user:', session.user.id)
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // If converting to 'user', clear role-specific fields
    const updateData: any = {
      role: newRole,
      updated_at: new Date().toISOString(),
    }

    if (newRole === 'user') {
      // Clear player-specific fields
      updateData.hudl_link = null
      updateData.hudl_links = null
      updateData.sport = null
      updateData.position = null
      updateData.school = null
      updateData.graduation_year = null
      updateData.graduation_month = null
      updateData.parent_name = null
      // Clear scout-specific fields
      updateData.organization = null
      updateData.sports = null
      updateData.price_per_eval = null
      updateData.turnaround_time = null
      updateData.social_link = null
    } else if (newRole === 'player') {
      // Validate full_name is required for players
      if (!profile.full_name || profile.full_name.trim() === '') {
        return NextResponse.json(
          { error: 'Full name is required to convert to player role. Please update your profile with a name first.' },
          { status: 400 }
        )
      }
      // Clear scout-specific fields
      updateData.organization = null
      updateData.sports = null
      updateData.price_per_eval = null
      updateData.turnaround_time = null
      // Keep social_link if it exists, but it's required for players
      if (!profile.social_link) {
        updateData.social_link = null
      }
    } else if (newRole === 'scout') {
      // Clear player-specific fields
      updateData.hudl_link = null
      updateData.hudl_links = null
      updateData.sport = null
      updateData.position = null
      updateData.school = null
      updateData.graduation_year = null
      updateData.graduation_month = null
      updateData.parent_name = null
      // Keep social_link if it exists, but it's required for scouts
      if (!profile.social_link) {
        updateData.social_link = null
      }
    } else if (newRole === 'parent') {
      // Clear player-specific fields
      updateData.hudl_link = null
      updateData.hudl_links = null
      updateData.sport = null
      updateData.position = null
      updateData.school = null
      updateData.graduation_year = null
      updateData.graduation_month = null
      // Clear scout-specific fields
      updateData.organization = null
      updateData.sports = null
      updateData.price_per_eval = null
      updateData.turnaround_time = null
      // Keep social_link if it exists
      if (!profile.social_link) {
        updateData.social_link = null
      }
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', session.user.id)

    if (updateError) {
      return handleApiError(updateError, 'Failed to update role')
    }

    // Create notifications for role conversions
    try {
      if (newRole === 'player' && profile.role === 'user') {
        // New user converting to player
        await createNotification({
          userId: session.user.id,
          type: 'user_converted_to_player',
          title: 'Account Updated',
          message: 'Your account has been updated to Player. Start browsing scouts!',
          link: '/browse',
          metadata: {
            previous_role: profile.role,
            new_role: 'player',
          },
        })
      } else if (newRole === 'user' && profile.role !== 'user') {
        // Existing user converting to basic user
        await createNotification({
          userId: session.user.id,
          type: 'user_converted_to_basic',
          title: 'Account Updated',
          message: 'Your account has been updated to a basic user account.',
          link: '/profile',
          metadata: {
            previous_role: profile.role,
            new_role: 'user',
          },
        })
      }
    } catch (notificationError) {
      console.error('Error creating role conversion notification:', notificationError)
      // Don't fail role conversion if notification fails
    }

    // If converting to player, scout, or parent, redirect to setup page
    let redirectUrl = '/profile'
    if (newRole === 'player') {
      redirectUrl = '/profile/player-setup'
    } else if (newRole === 'scout') {
      redirectUrl = '/profile/scout-setup'
    } else if (newRole === 'parent') {
      redirectUrl = '/profile/parent-setup'
    }

    return successResponse({
      success: true,
      redirectUrl,
    })
  } catch (error: any) {
    return handleApiError(error, 'Internal server error')
  }
}

