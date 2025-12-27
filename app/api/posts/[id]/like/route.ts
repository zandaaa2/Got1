import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase'

/**
 * POST: Like or unlike a post
 * DELETE: Unlike a post (alternative method)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const postId = resolvedParams.id

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check if user already liked this post
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingLike) {
      // Unlike: delete the like
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error unliking post:', error)
        return NextResponse.json({ error: 'Failed to unlike post' }, { status: 500 })
      }

      // Get updated like count
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      return NextResponse.json({ liked: false, likeCount: count || 0 })
    } else {
      // Like: insert new like
      const { error } = await supabase
        .from('post_likes')
        .insert([{ post_id: postId, user_id: userId }])

      if (error) {
        console.error('Error liking post:', error)
        return NextResponse.json({ error: 'Failed to like post' }, { status: 500 })
      }

      // Get updated like count
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      return NextResponse.json({ liked: true, likeCount: count || 0 })
    }
  } catch (error: any) {
    console.error('Error in POST /api/posts/[id]/like:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET: Get like count and whether current user has liked the post
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const postId = resolvedParams.id

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Get like count
    const { count, error: countError } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    if (countError) {
      console.error('Error getting like count:', countError)
      return NextResponse.json({ error: 'Failed to get like count' }, { status: 500 })
    }

    let isLiked = false
    if (session) {
      // Check if current user has liked this post
      const { data: userLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', session.user.id)
        .maybeSingle()

      isLiked = !!userLike
    }

    return NextResponse.json({
      likeCount: count || 0,
      isLiked,
    })
  } catch (error: any) {
    console.error('Error in GET /api/posts/[id]/like:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

