import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

    const body = await request.json()
    const { schoolId, schoolName } = body

    if (!schoolId || !schoolName) {
      return NextResponse.json(
        { error: 'Missing schoolId or schoolName' },
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

    // Get school admins
    const { data: admins } = await adminSupabase
      .from('high_school_admins')
      .select('user_id')
      .eq('high_school_id', schoolId)

    if (!admins || admins.length === 0) {
      return NextResponse.json(
        { error: 'No admins found for this school' },
        { status: 404 }
      )
    }

    // Get player profile
    const { data: playerProfile } = await adminSupabase
      .from('profiles')
      .select('full_name, username, position, graduation_month, graduation_year')
      .eq('user_id', session.user.id)
      .single()

    if (!playerProfile) {
      return NextResponse.json(
        { error: 'Player profile not found' },
        { status: 404 }
      )
    }

    // Check if request already exists
    const { data: existingRequest } = await adminSupabase
      .from('high_school_players')
      .select('id, request_status, joined_at')
      .eq('high_school_id', schoolId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (existingRequest) {
      if (existingRequest.request_status === 'pending') {
        return NextResponse.json(
          { error: 'You have already requested to join this school' },
          { status: 400 }
        )
      }
      if (existingRequest.request_status === 'accepted' || existingRequest.joined_at) {
        return NextResponse.json(
          { error: 'You are already on this school roster' },
          { status: 400 }
        )
      }
    }

    // Get player's email
    let playerEmail: string | null = null
    try {
      const { data } = await adminSupabase.auth.admin.getUserById(session.user.id)
      playerEmail = data.user?.email?.toLowerCase() || null
    } catch (error) {
      console.error('Failed to fetch user email for school request', error)
    }

    // Get school info
    const { data: school } = await adminSupabase
      .from('high_schools')
      .select('name, username')
      .eq('id', schoolId)
      .single()

    // Create roster request record (player-initiated, so added_by is null)
    const positions = playerProfile.position ? [playerProfile.position] : []

    const { data: rosterRequest, error: createError } = await adminSupabase
      .from('high_school_players')
      .insert({
        high_school_id: schoolId,
        user_id: session.user.id,
        name: playerProfile.full_name || playerProfile.username || 'Player',
        positions: positions,
        email: playerEmail || `${session.user.id.substring(0, 8)}@got1.app`,
        username: playerProfile.username || null,
        graduation_month: playerProfile.graduation_month?.toString() || null,
        graduation_year: playerProfile.graduation_year || null,
        jersey_number: null,
        request_status: 'pending',
        requested_at: new Date().toISOString(),
        added_by: null, // Player-initiated, so no added_by admin
      })
      .select()
      .single()

    if (createError || !rosterRequest) {
      return NextResponse.json(
        { error: createError?.message || 'Failed to create roster request' },
        { status: 500 }
      )
    }

    // Send notification to each admin
    const notificationPromises = admins.map(admin =>
      createNotification({
        userId: admin.user_id,
        type: 'player_school_request',
        title: 'Player School Request',
        message: `${playerProfile?.full_name || 'A player'} has requested to join ${school?.name || schoolName}.`,
        link: school?.username ? `/high-school/${school.username}/roster` : `/high-school/${schoolId}/roster`,
        metadata: {
          player_id: session.user.id,
          school_id: schoolId,
          school_name: schoolName,
          player_record_id: rosterRequest.id, // Add the roster record ID for reference
        },
      })
    )

    await Promise.all(notificationPromises)

    return successResponse({ success: true })
  } catch (error: any) {
    return handleApiError(error, 'Failed to send school request')
  }
}


