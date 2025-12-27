import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'

/**
 * Checks if the current user is following a specific user.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      )
    }

    // Check if following
    const { data: follow, error: followError } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', session.user.id)
      .eq('following_id', userId)
      .maybeSingle()

    if (followError) {
      console.error('Error checking follow status:', followError)
      return handleApiError(followError, 'Failed to check follow status')
    }

    return successResponse({ isFollowing: !!follow })
  } catch (error: any) {
    console.error('Error checking follow status:', error)
    return handleApiError(error, 'Internal server error')
  }
}
