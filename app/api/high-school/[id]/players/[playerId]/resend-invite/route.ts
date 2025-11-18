import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isHighSchoolAdmin } from '@/lib/high-school/school'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendRosterInviteEmail } from '@/lib/email/high-school-invite'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; playerId: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

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

    const { data: player, error: playerError } = await adminSupabase
      .from('high_school_players')
      .select('id, name, email, invite_token, user_id')
      .eq('id', params.playerId)
      .eq('high_school_id', params.id)
      .maybeSingle()

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    if (player.user_id) {
      return NextResponse.json(
        { error: 'Cannot resend invite for a player who has already joined' },
        { status: 400 }
      )
    }

    let inviteToken = player.invite_token
    if (!inviteToken) {
      inviteToken = crypto.randomUUID()
      const { error: updateError } = await adminSupabase
        .from('high_school_players')
        .update({ invite_token: inviteToken })
        .eq('id', params.playerId)

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || 'Failed to generate invite token' },
          { status: 500 }
        )
      }
    }

    const { data: school } = await adminSupabase
      .from('high_schools')
      .select('name')
      .eq('id', params.id)
      .maybeSingle()

    await sendRosterInviteEmail({
      email: player.email,
      schoolName: school?.name || '',
      schoolId: params.id,
      inviteToken,
      playerName: player.name,
    })

    return successResponse({ success: true })
  } catch (error: any) {
    return handleApiError(error, 'Failed to resend invite')
  }
}
