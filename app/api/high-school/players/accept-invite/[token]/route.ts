import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createAdminClient } from '@/lib/supabase-admin'
import { linkPlayerToSchool } from '@/lib/high-school/players'
import { createNotification } from '@/lib/notifications'
import { requireAuth } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

/**
 * Page route for accepting roster invite via email link
 * This redirects authenticated users to join the school
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Get invite details
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return NextResponse.redirect(new URL('/auth/signin?error=server_error', request.url))
  }

  const { data: playerRecord } = await adminSupabase
    .from('high_school_players')
    .select('high_school_id, email, name, user_id')
    .eq('invite_token', params.token)
    .maybeSingle()

  if (!playerRecord) {
    return NextResponse.redirect(new URL('/auth/signin?error=invalid_invite', request.url))
  }

  // If user is signed in
  if (session) {
    // Link them to the school
    const result = await linkPlayerToSchool(session.user.id, playerRecord.high_school_id, params.token)

    if (result.success) {
      // Send notification
      await createNotification({
        userId: session.user.id,
        type: 'player_joined_school',
        title: 'Joined School Roster',
        message: `You've successfully joined ${playerRecord.name}'s roster.`,
        link: `/high-school/${playerRecord.high_school_id}`,
        metadata: {
          school_id: playerRecord.high_school_id,
        },
      })

      // Redirect to school page
      const { data: school } = await adminSupabase
        .from('high_schools')
        .select('username')
        .eq('id', playerRecord.high_school_id)
        .maybeSingle()

      if (school) {
        return NextResponse.redirect(new URL(`/high-school/${school.username}`, request.url))
      }
    }

    return NextResponse.redirect(new URL('/my-evals', request.url))
  }

  // If not signed in, redirect to signup with invite token
  return NextResponse.redirect(
    new URL(`/auth/signin?invite_token=${params.token}&email=${encodeURIComponent(playerRecord.email)}`, request.url)
  )
}

/**
 * API route for accepting invite (called after user signs up)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

    // Link player to school
    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { data: playerRecord } = await adminSupabase
      .from('high_school_players')
      .select('high_school_id')
      .eq('invite_token', params.token)
      .maybeSingle()

    if (!playerRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired invite token' },
        { status: 400 }
      )
    }

    const result = await linkPlayerToSchool(session.user.id, playerRecord.high_school_id, params.token)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to accept invite' },
        { status: 400 }
      )
    }

    // Send notification
    await createNotification({
      userId: session.user.id,
      type: 'player_joined_school',
      title: 'Joined School Roster',
      message: 'You\'ve successfully joined the school roster.',
      link: `/high-school/${playerRecord.high_school_id}`,
      metadata: {
        school_id: playerRecord.high_school_id,
      },
    })

    return NextResponse.json({ success: true, schoolId: playerRecord.high_school_id })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to accept invite' },
      { status: 500 }
    )
  }
}

