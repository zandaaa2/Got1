import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'

/**
 * Follows a user.
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

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot follow yourself' },
        { status: 400 }
      )
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', session.user.id)
      .eq('following_id', userId)
      .maybeSingle()

    if (existing) {
      return successResponse({ success: true, alreadyFollowing: true })
    }

    // Create follow relationship
    const { error: followError } = await supabase
      .from('follows')
      .insert({
        follower_id: session.user.id,
        following_id: userId,
      })

    if (followError) {
      console.error('Error following user:', followError)
      return handleApiError(followError, 'Failed to follow user')
    }

    return successResponse({ success: true })
  } catch (error: any) {
    console.error('Error following user:', error)
    return handleApiError(error, 'Internal server error')
  }
}
