import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase'

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

