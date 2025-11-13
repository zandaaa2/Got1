import { createRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
    const { newRole, password } = body

    // Validate role
    if (!newRole || !['user', 'player', 'scout'].includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be user, player, or scout' },
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
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', session.user.id)

    if (updateError) {
      console.error('Error updating profile role:', updateError)
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      )
    }

    // If converting to player or scout, redirect to setup page
    let redirectUrl = '/profile'
    if (newRole === 'player') {
      redirectUrl = '/profile/player-setup'
    } else if (newRole === 'scout') {
      redirectUrl = '/profile/scout-setup'
    }

    return NextResponse.json({
      success: true,
      redirectUrl,
    })
  } catch (error: any) {
    console.error('Error converting role:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

