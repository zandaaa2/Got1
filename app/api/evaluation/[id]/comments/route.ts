import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createNotification } from '@/lib/notifications'

/**
 * GET: Get all comments for an evaluation
 * POST: Create a new comment on an evaluation
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

    const evaluationId = (await params).id

    // Verify the evaluation exists and user has access
    const { data: evaluation } = await supabase
      .from('evaluations')
      .select('id, scout_id, player_id')
      .eq('id', evaluationId)
      .maybeSingle()

    if (!evaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      )
    }

    // Get comments for the evaluation (non-deleted only)
    const { data: comments, error: commentsError } = await supabase
      .from('evaluation_comments')
      .select('id, user_id, content, created_at, updated_at')
      .eq('evaluation_id', evaluationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('Error fetching comments:', commentsError)
      return handleApiError(commentsError, 'Failed to fetch comments')
    }

    // Get unique user IDs from comments
    const userIds = Array.from(new Set(comments?.map(c => c.user_id) || []))

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
    console.error('Error in GET /api/evaluation/[id]/comments:', error)
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

    const evaluationId = (await params).id
    const body = await request.json()
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      )
    }

    // Verify the evaluation exists and get scout_id and player_id
    const { data: evaluation, error: evaluationError } = await supabase
      .from('evaluations')
      .select('id, scout_id, player_id')
      .eq('id', evaluationId)
      .maybeSingle()

    if (evaluationError || !evaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      )
    }

    // Create the comment
    const { data: comment, error: commentError } = await supabase
      .from('evaluation_comments')
      .insert({
        evaluation_id: evaluationId,
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

    // Create notification for evaluation owner (scout or player, depending on who commented)
    try {
      // Determine who should be notified
      // If the scout commented, notify the player
      // If the player (or anyone else) commented, notify the scout
      let notifyUserId: string | null = null
      
      if (session.user.id === evaluation.scout_id) {
        // Scout commented - notify the player
        notifyUserId = evaluation.player_id
      } else {
        // Player or someone else commented - notify the scout
        notifyUserId = evaluation.scout_id
      }

      // Only notify if not commenting on own evaluation
      if (notifyUserId && notifyUserId !== session.user.id) {
        const commenterName = profile?.full_name || profile?.username || 'Someone'
        
        await createNotification({
          userId: notifyUserId,
          type: 'evaluation_commented',
          title: 'New Comment',
          message: `${commenterName} commented on your evaluation`,
          link: `/evaluations/${evaluationId}`,
          metadata: { evaluation_id: evaluationId, commenter_id: session.user.id, comment_id: comment.id },
        })
      }
    } catch (notifError) {
      // Don't fail the comment if notification creation fails
      console.error('Error creating comment notification:', notifError)
    }

    return successResponse({ comment: commentWithProfile })
  } catch (error: any) {
    console.error('Error in POST /api/evaluation/[id]/comments:', error)
    return handleApiError(error, 'Internal server error')
  }
}

export const dynamic = 'force-dynamic'

