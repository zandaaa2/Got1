import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'

/**
 * Creates a new post.
 * Supports text, image, and video content (max 1 media per post).
 * Videos limited to 1 minute.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const body = await request.json()
    const { content, imageUrl, videoUrl, videoThumbnailUrl } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Post content is required' },
        { status: 400 }
      )
    }

    // Ensure only one media type
    if (imageUrl && videoUrl) {
      return NextResponse.json(
        { error: 'A post can only have either an image or video, not both' },
        { status: 400 }
      )
    }

    // Create the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: session.user.id,
        content: content.trim(),
        image_url: imageUrl || null,
        video_url: videoUrl || null,
        video_thumbnail_url: videoThumbnailUrl || null,
      })
      .select()
      .single()

    if (postError || !post) {
      console.error('Error creating post:', postError)
      return handleApiError(postError, 'Failed to create post')
    }

    return successResponse({ post })
  } catch (error: any) {
    console.error('Error creating post:', error)
    return handleApiError(error, 'Internal server error')
  }
}
