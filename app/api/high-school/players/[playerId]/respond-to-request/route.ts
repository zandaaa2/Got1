import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications'
import { linkPlayerToSchool } from '@/lib/high-school/players'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

    const body = await request.json()
    const { action } = body // 'accept' or 'deny'

    if (!['accept', 'deny'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "deny"' },
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

    // Get the player record
    const { data: playerRecord, error: fetchError } = await adminSupabase
      .from('high_school_players')
      .select('id, high_school_id, user_id, request_status, added_by, name')
      .eq('id', params.playerId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (fetchError || !playerRecord) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    if (playerRecord.request_status !== 'pending') {
      return NextResponse.json(
        { error: 'This request has already been responded to' },
        { status: 400 }
      )
    }

    // Get school info for notifications
    const { data: school } = await adminSupabase
      .from('high_schools')
      .select('name, username')
      .eq('id', playerRecord.high_school_id)
      .maybeSingle()

    // Get admin info for notification
    const { data: adminProfile } = await adminSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', playerRecord.added_by)
      .maybeSingle()

    if (action === 'accept') {
      // Update request status and link player
      const { error: updateError } = await adminSupabase
        .from('high_school_players')
        .update({
          request_status: 'accepted',
        })
        .eq('id', params.playerId)

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || 'Failed to accept request' },
          { status: 500 }
        )
      }

      // Link player to school (this will set joined_at and update profile.high_school_id)
      // Note: linkPlayerToSchool() updates the high_school_id foreign key but not the school name text field
      const linkResult = await linkPlayerToSchool(
        session.user.id,
        playerRecord.high_school_id,
        null
      )

      if (!linkResult.success) {
        return NextResponse.json(
          { error: linkResult.error || 'Failed to link player to school' },
          { status: 500 }
        )
      }

      // Update profile school name field (denormalized text field for display)
      // This is separate from high_school_id (foreign key) which was updated by linkPlayerToSchool()
      // We update both to keep the denormalized data in sync with the relationship
      if (school) {
        const { error: profileError } = await adminSupabase
          .from('profiles')
          .update({ school: school.name })
          .eq('user_id', session.user.id)
        
        if (profileError) {
          console.error('Error updating profile school field:', profileError)
          // Don't fail the whole operation if profile update fails
        }
      }

      // Notify admin
      await createNotification({
        userId: playerRecord.added_by,
        type: 'school_roster_accepted',
        title: 'Roster Request Accepted',
        message: `${playerRecord.name || session.user.email} has accepted your request to join ${school?.name || 'the roster'}.`,
        link: `/high-school/${school?.username || playerRecord.high_school_id}/roster`,
        metadata: {
          school_id: playerRecord.high_school_id,
          player_id: params.playerId,
          accepted_by: session.user.id,
        },
      })
    } else {
      // Deny request
      const { error: updateError } = await adminSupabase
        .from('high_school_players')
        .update({
          request_status: 'denied',
        })
        .eq('id', params.playerId)

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || 'Failed to deny request' },
          { status: 500 }
        )
      }

      // Notify admin
      await createNotification({
        userId: playerRecord.added_by,
        type: 'school_roster_denied',
        title: 'Roster Request Denied',
        message: `${playerRecord.name || session.user.email} has denied your request to join ${school?.name || 'the roster'}.`,
        link: `/high-school/${school?.username || playerRecord.high_school_id}/roster`,
        metadata: {
          school_id: playerRecord.high_school_id,
          player_id: params.playerId,
          denied_by: session.user.id,
        },
      })
    }

    return successResponse({ success: true, action })
  } catch (error: any) {
    return handleApiError(error, 'Failed to respond to request')
  }
}

