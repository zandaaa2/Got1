import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createNotification } from '@/lib/notifications'

/**
 * GET: Get all comments for a blog post
 * POST: Create a new comment on a blog post
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { supabase } = authResult

    const { slug } = await params

    // Get the blog post ID from slug
    const { data: blogPost } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!blogPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      )
    }

    // Get comments for the blog post
    const { data: comments, error: commentsError } = await supabase
      .from('blog_comments')
      .select('id, user_id, content, created_at, updated_at')
      .eq('blog_post_id', blogPost.id)
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
    console.error('Error in GET /api/blog/[slug]/comments:', error)
    return handleApiError(error, 'Internal server error')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const { slug } = await params
    const body = await request.json()
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      )
    }

    // Get the blog post and verify it exists
    const { data: blogPost, error: blogPostError } = await supabase
      .from('blog_posts')
      .select('id, scout_id, author_email')
      .eq('slug', slug)
      .maybeSingle()

    if (blogPostError || !blogPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      )
    }

    // Create the comment
    const { data: comment, error: commentError } = await supabase
      .from('blog_comments')
      .insert({
        blog_post_id: blogPost.id,
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

    // Create notification for blog post author (if not commenting on their own post)
    try {
      // Get the author's user_id (from scout_id or by email)
      let authorUserId: string | null = blogPost.scout_id
      
      if (!authorUserId && blogPost.author_email) {
        const { data: authorProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', blogPost.author_email)
          .maybeSingle()
        authorUserId = authorProfile?.user_id || null
      }

      if (authorUserId && authorUserId !== session.user.id) {
        const commenterName = profile?.full_name || profile?.username || 'Someone'
        
        await createNotification({
          userId: authorUserId,
          type: 'blog_post_commented',
          title: 'New Comment',
          message: `${commenterName} commented on your blog post`,
          link: `/blog/${slug}`,
          metadata: { blog_post_id: blogPost.id, commenter_id: session.user.id, comment_id: comment.id },
        })
      }
    } catch (notifError) {
      // Don't fail the comment if notification creation fails
      console.error('Error creating comment notification:', notifError)
    }

    return successResponse({ comment: commentWithProfile })
  } catch (error: any) {
    console.error('Error in POST /api/blog/[slug]/comments:', error)
    return handleApiError(error, 'Internal server error')
  }
}

export const dynamic = 'force-dynamic'

