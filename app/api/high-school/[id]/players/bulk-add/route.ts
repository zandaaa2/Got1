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

    const isAdmin = await isHighSchoolAdmin(session.user.id, params.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be an admin of this school' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { players } = body

    if (!Array.isArray(players) || players.length === 0) {
      return NextResponse.json(
        { error: 'Players array is required' },
        { status: 400 }
      )
    }

    if (players.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 players per upload' },
        { status: 400 }
      )
    }

    const failures: { name: string; email: string; error: string }[] = []
    let added = 0

    for (const player of players) {
      const name = player?.name?.trim()
      const email = player?.email?.trim()?.toLowerCase()
      const positions = player?.positions
      const username = player?.username?.trim() || undefined
      const graduationMonth = player?.graduation_month?.trim() || null
      const graduationYear = player?.graduation_year ? Number(player.graduation_year) : null
      const jerseyNumber = player?.jersey_number?.trim() || null

      if (!name || !email || !Array.isArray(positions)) {
        failures.push({
          name: name || '(unknown)',
          email: email || '(unknown)',
          error: 'Missing required fields',
        })
        continue
      }

      const validation = validatePositions(positions)
      if (!validation.valid) {
        failures.push({
          name,
          email,
          error: validation.error || 'Invalid positions',
        })
        continue
      }

      const result = await addPlayerToRoster(
        params.id,
        {
          name,
          email,
          username,
          positions,
          graduation_month: graduationMonth,
          graduation_year: graduationYear,
          jersey_number: jerseyNumber,
        },
        session.user.id
      )

      if (!result.success) {
        failures.push({
          name,
          email,
          error: result.error || 'Failed to add player',
        })
      } else {
        added += 1
      }
    }

    return successResponse({
      success: failures.length === 0,
      added,
      failed: failures.length,
      failures,
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to bulk add players')
  }
}


