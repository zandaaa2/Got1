import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'

/**
 * DELETE: Delete a post (soft delete by setting deleted_at)
 * PUT: Update a post
 */
export async function DELETE(
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
        { error: 'You do not have permission to delete this post' },
        { status: 403 }
      )
    }

    // Soft delete by setting deleted_at
    const { error: deleteError } = await supabase
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', postId)

    if (deleteError) {
      console.error('Error deleting post:', deleteError)
      return handleApiError(deleteError, 'Failed to delete post')
    }

    return successResponse({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/posts/[id]:', error)
    return handleApiError(error, 'Internal server error')
  }
}

export async function PUT(
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
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Post content is required' },
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
        { error: 'You do not have permission to edit this post' },
        { status: 403 }
      )
    }

    // Update the post
    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .select('id, user_id, content, image_url, video_url, video_thumbnail_url, created_at, updated_at, pinned')
      .single()

    if (updateError || !updatedPost) {
      console.error('Error updating post:', updateError)
      return handleApiError(updateError, 'Failed to update post')
    }

    return successResponse({ post: updatedPost })
  } catch (error: any) {
    console.error('Error in PUT /api/posts/[id]:', error)
    return handleApiError(error, 'Internal server error')
  }
}

export const dynamic = 'force-dynamic'
