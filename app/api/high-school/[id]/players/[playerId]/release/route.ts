import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isHighSchoolAdmin } from '@/lib/high-school/school'
import { releasePlayer } from '@/lib/high-school/players'

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

    // Check if user is admin of this school
    const isAdmin = await isHighSchoolAdmin(session.user.id, params.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be an admin of this school' },
        { status: 403 }
      )
    }

    // Release player
    const result = await releasePlayer(params.playerId, params.id, session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to release player' },
        { status: 400 }
      )
    }

    return successResponse({ success: true })
  } catch (error: any) {
    return handleApiError(error, 'Failed to release player')
  }
}


