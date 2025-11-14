import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAdmin, handleApiError, successResponse } from '@/lib/api-helpers'

/**
 * API route to suspend a scout for a specified number of days.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Require admin access
    const adminResult = await requireAdmin(request)
    if (adminResult.response) {
      return adminResult.response
    }
    const { session, supabase } = adminResult

    const { userId } = params
    const body = await request.json()
    const { days, reason } = body

    if (!days || typeof days !== 'number' || days < 1) {
      return NextResponse.json(
        { error: 'Invalid number of days' },
        { status: 400 }
      )
    }

    // Get the scout's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role !== 'scout') {
      return NextResponse.json(
        { error: 'User is not a scout' },
        { status: 400 }
      )
    }

    // Calculate suspension end date
    const suspendedUntil = new Date()
    suspendedUntil.setDate(suspendedUntil.getDate() + days)

    // Update profile with suspension
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        suspended_until: suspendedUntil.toISOString(),
        suspended_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) {
      return handleApiError(updateError, 'Failed to suspend scout')
    }

    return successResponse({
      success: true,
      suspended_until: suspendedUntil.toISOString(),
    })
  } catch (error: any) {
    return handleApiError(error, 'Internal server error')
  }
}

