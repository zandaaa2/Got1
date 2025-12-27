import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'

/**
 * GET: Get all comments for a post
 * POST: Create a new comment on a post
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { supabase } = authResult

    const postId = params.id

    // Get comments for the post (non-deleted only)
    const { data: comments, error: commentsError } = await supabase
      .from('post_comments')
      .select('id, user_id, content, created_at, updated_at')
      .eq('post_id', postId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('Error fetching comments:', commentsError)
      return handleApiError(commentsError, 'Failed to fetch comments')
    }

    // Get unique user IDs from comments
    const userIds = [...new Set(comments?.map(c => c.user_id) || [])]

    // Fetch profiles for comment authors
    let profilesMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, username, full_name, avatar_url, organization, school, position')
        .in('user_id', userIds)

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
      } else {
        profiles.forEach(profile => {
          profilesMap[profile.user_id] = profile
        })
      }
    }

    // Join comments with profiles
    const commentsWithProfiles = (comments || []).map(comment => ({
      ...comment,
      profile: profilesMap[comment.user_id] || null,
    }))

    return successResponse({ comments: commentsWithProfiles })
  } catch (error: any) {
    console.error('Error in GET /api/posts/[id]/comments:', error)
    return handleApiError(error, 'Internal server error')
  }
}

export async function POST(
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
        { error: 'Comment content is required' },
        { status: 400 }
      )
    }

    // Verify the post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .is('deleted_at', null)
      .maybeSingle()

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Create the comment
    const { data: comment, error: commentError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: session.user.id,
        content: content.trim(),
      })
      .select()
      .single()

    if (commentError || !comment) {
      console.error('Error creating comment:', commentError)
      return handleApiError(commentError, 'Failed to create comment')
    }

    // Get the comment with profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, user_id, username, full_name, avatar_url, organization, school, position')
      .eq('user_id', session.user.id)
      .maybeSingle()

    const commentWithProfile = {
      ...comment,
      profile: profile || null,
    }

    return successResponse({ comment: commentWithProfile })
  } catch (error: any) {
    console.error('Error in POST /api/posts/[id]/comments:', error)
    return handleApiError(error, 'Internal server error')
  }
}

export const dynamic = 'force-dynamic'
