import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'

/**
 * PATCH: Toggle pin status for a post
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const postId = params.id
    const body = await request.json()
    const { pinned } = body

    if (typeof pinned !== 'boolean') {
      return NextResponse.json(
        { error: 'pinned must be a boolean' },
        { status: 400 }
      )
    }

    // Verify the post exists and belongs to the user
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .is('deleted_at', null)
      .maybeSingle()

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Check if user owns the post
    if (post.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to pin this post' },
        { status: 403 }
      )
    }

    // Update the pin status
    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update({ pinned })
      .eq('id', postId)
      .select()
      .single()

    if (updateError || !updatedPost) {
      console.error('Error updating post pin status:', updateError)
      return handleApiError(updateError, 'Failed to update pin status')
    }

    return successResponse({ post: updatedPost })
  } catch (error: any) {
    console.error('Error in PATCH /api/posts/[id]/pin:', error)
    return handleApiError(error, 'Internal server error')
  }
}

export const dynamic = 'force-dynamic'

