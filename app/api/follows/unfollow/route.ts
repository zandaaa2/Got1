import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'

/**
 * Unfollows a user.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Remove follow relationship
    const { error: unfollowError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', session.user.id)
      .eq('following_id', userId)

    if (unfollowError) {
      console.error('Error unfollowing user:', unfollowError)
      return handleApiError(unfollowError, 'Failed to unfollow user')
    }

    return successResponse({ success: true })
  } catch (error: any) {
    console.error('Error unfollowing user:', error)
    return handleApiError(error, 'Internal server error')
  }
}
