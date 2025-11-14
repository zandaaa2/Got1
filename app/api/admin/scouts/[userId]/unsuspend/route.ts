import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAdmin, handleApiError, successResponse } from '@/lib/api-helpers'

/**
 * API route to lift a scout's suspension immediately.
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

    // Get the scout's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Lift suspension by clearing suspended_until and suspended_reason
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        suspended_until: null,
        suspended_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) {
      return handleApiError(updateError, 'Failed to lift suspension')
    }

    return successResponse({ success: true })
  } catch (error: any) {
    return handleApiError(error, 'Internal server error')
  }
}

