import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createNotification } from '@/lib/notifications'

/**
 * POST: Like or unlike content (evaluation, post, or blog_post)
 * Body: { likeableType: 'evaluation' | 'post' | 'blog_post', likeableId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { likeableType, likeableId } = body

    if (!likeableType || !likeableId) {
      return NextResponse.json(
        { error: 'likeableType and likeableId are required' },
        { status: 400 }
      )
    }

    if (!['evaluation', 'post', 'blog_post'].includes(likeableType)) {
      return NextResponse.json(
        { error: 'Invalid likeableType. Must be evaluation, post, or blog_post' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check if user already liked this content
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('likeable_type', likeableType)
      .eq('likeable_id', likeableId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingLike) {
      // Unlike: delete the like
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('likeable_type', likeableType)
        .eq('likeable_id', likeableId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error unliking:', error)
        return NextResponse.json({ error: 'Failed to unlike' }, { status: 500 })
      }

      // Get updated like count
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('likeable_type', likeableType)
        .eq('likeable_id', likeableId)

      return NextResponse.json({ liked: false, likeCount: count || 0 })
    } else {
      // Like: insert new like
      const { error } = await supabase
        .from('likes')
        .insert([{ likeable_type: likeableType, likeable_id: likeableId, user_id: userId }])

      if (error) {
        console.error('Error liking:', error)
        return NextResponse.json({ error: 'Failed to like' }, { status: 500 })
      }

      // Create notifications for likes
      try {
        if (likeableType === 'post') {
          // Get the post owner's user_id
          const { data: post } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', likeableId)
            .maybeSingle()

          if (post && post.user_id !== userId) {
            // Get the liker's profile for the notification message
            const { data: likerProfile } = await supabase
              .from('profiles')
              .select('full_name, username')
              .eq('user_id', userId)
              .maybeSingle()

            const likerName = likerProfile?.full_name || likerProfile?.username || 'Someone'
            
            await createNotification({
              userId: post.user_id,
              type: 'post_liked',
              title: 'New Like',
              message: `${likerName} liked your post`,
              link: `/home?post=${likeableId}`,
              metadata: { post_id: likeableId, liker_id: userId },
            })
          }
        } else if (likeableType === 'blog_post') {
          // Get the blog post author's user_id
          const { data: blogPost } = await supabase
            .from('blog_posts')
            .select('scout_id, author_email')
            .eq('id', likeableId)
            .maybeSingle()

          if (blogPost) {
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

            if (authorUserId && authorUserId !== userId) {
              // Get the liker's profile for the notification message
              const { data: likerProfile } = await supabase
                .from('profiles')
                .select('full_name, username')
                .eq('user_id', userId)
                .maybeSingle()

              const likerName = likerProfile?.full_name || likerProfile?.username || 'Someone'
              
              // Get blog slug for the link
              const { data: blogSlug } = await supabase
                .from('blog_posts')
                .select('slug')
                .eq('id', likeableId)
                .maybeSingle()
            
              await createNotification({
                userId: authorUserId,
                type: 'blog_post_liked',
                title: 'New Like',
                message: `${likerName} liked your blog post`,
                link: blogSlug ? `/blog/${blogSlug.slug}` : `/blog`,
                metadata: { blog_post_id: likeableId, liker_id: userId },
              })
            }
          }
        } else if (likeableType === 'evaluation') {
          // Get the evaluation's scout_id (scout wrote it, so they should be notified)
          const { data: evaluation } = await supabase
            .from('evaluations')
            .select('scout_id')
            .eq('id', likeableId)
            .maybeSingle()

          if (evaluation && evaluation.scout_id !== userId) {
            // Get the liker's profile for the notification message
            const { data: likerProfile } = await supabase
              .from('profiles')
              .select('full_name, username')
              .eq('user_id', userId)
              .maybeSingle()

            const likerName = likerProfile?.full_name || likerProfile?.username || 'Someone'
            
            await createNotification({
              userId: evaluation.scout_id,
              type: 'evaluation_liked',
              title: 'New Like',
              message: `${likerName} liked your evaluation`,
              link: `/evaluations/${likeableId}`,
              metadata: { evaluation_id: likeableId, liker_id: userId },
            })
          }
        }
      } catch (notifError) {
        // Don't fail the like if notification creation fails
        console.error('Error creating like notification:', notifError)
      }

      // Get updated like count
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('likeable_type', likeableType)
        .eq('likeable_id', likeableId)

      return NextResponse.json({ liked: true, likeCount: count || 0 })
    }
  } catch (error: any) {
    console.error('Error in POST /api/likes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET: Get like count and whether current user has liked the content
 * Query params: likeableType, likeableId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const likeableType = searchParams.get('likeableType')
    const likeableId = searchParams.get('likeableId')

    if (!likeableType || !likeableId) {
      return NextResponse.json(
        { error: 'likeableType and likeableId are required' },
        { status: 400 }
      )
    }

    if (!['evaluation', 'post', 'blog_post'].includes(likeableType)) {
      return NextResponse.json(
        { error: 'Invalid likeableType. Must be evaluation, post, or blog_post' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Get like count
    const { count, error: countError } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('likeable_type', likeableType)
      .eq('likeable_id', likeableId)

    if (countError) {
      console.error('Error getting like count:', countError)
      return NextResponse.json({ error: 'Failed to get like count' }, { status: 500 })
    }

    let isLiked = false
    if (session) {
      // Check if current user has liked this content
      const { data: userLike } = await supabase
        .from('likes')
        .select('id')
        .eq('likeable_type', likeableType)
        .eq('likeable_id', likeableId)
        .eq('user_id', session.user.id)
        .maybeSingle()

      isLiked = !!userLike
    }

    return NextResponse.json({
      likeCount: count || 0,
      isLiked,
    })
  } catch (error: any) {
    console.error('Error in GET /api/likes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

