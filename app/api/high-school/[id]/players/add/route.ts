import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isHighSchoolAdmin } from '@/lib/high-school/school'
import { addPlayerToRoster } from '@/lib/high-school/players'
import { validatePositions } from '@/lib/high-school/positions'

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

    const body = await request.json()
    const {
      name,
      positions,
      email,
      username,
      user_id,
      graduation_month,
      graduation_year,
      jersey_number,
    } = body

    if (!name || !positions || (!email && !user_id)) {
      return NextResponse.json(
        { error: 'Name, positions, and either email or user ID are required' },
        { status: 400 }
      )
    }

    // Validate positions
    const positionValidation = validatePositions(positions)
    if (!positionValidation.valid) {
      return NextResponse.json(
        { error: positionValidation.error },
        { status: 400 }
      )
    }

    // Add player to roster
    const result = await addPlayerToRoster(
      params.id,
      {
        name: name.trim(),
        positions,
        email: email ? email.trim().toLowerCase() : null,
        username: username?.trim() || undefined,
        user_id: user_id || undefined,
        graduation_month: graduation_month?.trim() || null,
        graduation_year: graduation_year ? Number(graduation_year) : null,
        jersey_number: jersey_number?.trim() || null,
      },
      session.user.id
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to add player' },
        { status: 400 }
      )
    }

    return successResponse({
      success: true,
      playerId: result.playerId,
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to add player to roster')
  }
}

