import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isHighSchoolAdmin } from '@/lib/high-school/school'
import { createAdminClient } from '@/lib/supabase-admin'
import { addPlayerToRoster, linkPlayerToSchool } from '@/lib/high-school/players'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * School admin responds to a player's request to join the school
 * Action can be 'accept' (adds player to roster) or 'deny' (no action, just marks as handled)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

    const body = await request.json()
    const { playerId, schoolId, action } = body // 'accept' or 'deny'

    if (!['accept', 'deny'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "deny"' },
        { status: 400 }
      )
    }

    if (!playerId || !schoolId) {
      return NextResponse.json(
        { error: 'Missing playerId or schoolId' },
        { status: 400 }
      )
    }

    // Check if user is admin of this school
    const isAdmin = await isHighSchoolAdmin(session.user.id, schoolId)
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

    // Get player profile
    const { data: playerProfile } = await adminSupabase
      .from('profiles')
      .select('user_id, full_name, username, position, graduation_month, graduation_year')
      .eq('user_id', playerId)
      .single()

    if (!playerProfile) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    // Get school info
    const { data: school } = await adminSupabase
      .from('high_schools')
      .select('name, username')
      .eq('id', schoolId)
      .single()

    if (action === 'accept') {
      // Check if there's already a pending request record (player-initiated)
      const { data: existingRequest } = await adminSupabase
        .from('high_school_players')
        .select('id, request_status')
        .eq('high_school_id', schoolId)
        .eq('user_id', playerId)
        .eq('request_status', 'pending')
        .maybeSingle()

      if (existingRequest) {
        // Update existing request to accepted and link player
        // linkPlayerToSchool will find the record by user_id and school_id when inviteToken is null
        const linkResult = await linkPlayerToSchool(playerId, schoolId, null)
        
        if (!linkResult.success) {
          return NextResponse.json(
            { error: linkResult.error || 'Failed to accept request' },
            { status: 500 }
          )
        }

        // Update request_status to accepted
        const { error: updateError } = await adminSupabase
          .from('high_school_players')
          .update({
            request_status: 'accepted',
          })
          .eq('id', existingRequest.id)

        if (updateError) {
          return NextResponse.json(
            { error: updateError.message || 'Failed to update request status' },
            { status: 500 }
          )
        }

        // Update profile school field
        if (school) {
          await adminSupabase
            .from('profiles')
            .update({ school: school.name })
            .eq('user_id', playerId)
        }
      } else {
        // No existing request, use addPlayerToRoster (fallback for admin-initiated)
        const positions = playerProfile.position 
          ? [playerProfile.position] 
          : []

        const result = await addPlayerToRoster(
          schoolId,
          {
            name: playerProfile.full_name || playerProfile.username || 'Player',
            positions: positions,
            email: null, // Will be fetched from auth
            username: playerProfile.username || null,
            user_id: playerProfile.user_id,
            graduation_month: playerProfile.graduation_month?.toString() || null,
            graduation_year: playerProfile.graduation_year || null,
            jersey_number: null,
          },
          session.user.id
        )

        if (!result.success) {
          return NextResponse.json(
            { error: result.error || 'Failed to add player to roster' },
            { status: 500 }
          )
        }
      }

      // Notify player
      await createNotification({
        userId: playerId,
        type: 'school_roster_accepted',
        title: 'School Request Accepted',
        message: `${school?.name || 'The school'} has accepted your request to join their roster.`,
        link: school?.username ? `/high-school/${school.username}` : `/high-school/${schoolId}`,
        metadata: {
          school_id: schoolId,
          player_id: playerId,
          accepted_by: session.user.id,
        },
      })
    } else {
      // Deny - remove the pending request record and notify player
      const { data: existingRequest } = await adminSupabase
        .from('high_school_players')
        .select('id')
        .eq('high_school_id', schoolId)
        .eq('user_id', playerId)
        .eq('request_status', 'pending')
        .maybeSingle()

      if (existingRequest) {
        await adminSupabase
          .from('high_school_players')
          .delete()
          .eq('id', existingRequest.id)
      }

      // Notify player
      await createNotification({
        userId: playerId,
        type: 'school_roster_denied',
        title: 'School Request Denied',
        message: `${school?.name || 'The school'} has denied your request to join their roster.`,
        link: `/profile`,
        metadata: {
          school_id: schoolId,
          player_id: playerId,
          denied_by: session.user.id,
        },
      })
    }

    return successResponse({ success: true, action })
  } catch (error: any) {
    return handleApiError(error, 'Failed to respond to school request')
  }
}

