import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const revalidate = 30 // Cache for 30 seconds

/**
 * Gets the feed of posts and completed evaluations.
 * Supports "trending" (all posts) or "following" (posts from followed users only).
 * Returns chronologically sorted items (newest first).
 * Optimized with pagination and parallel queries.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') || 'trending' // 'trending' or 'following'
    const limit = parseInt(searchParams.get('limit') || '20', 10) // Default 20 items
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Limit to prevent excessive data fetching
    const maxLimit = Math.min(limit, 50) // Cap at 50 items per request

    let postsQuery = supabase
      .from('posts')
      .select('id, user_id, content, image_url, video_url, video_thumbnail_url, created_at, updated_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + maxLimit - 1)

    // If following mode, filter by users the current user follows
    if (mode === 'following') {
      // Get list of user IDs that the current user follows
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', session.user.id)

      if (followsError) {
        console.error('Error fetching follows:', followsError)
        return handleApiError(followsError, 'Failed to fetch follows')
      }

      const followingIds = follows?.map(f => f.following_id) || []
      
      // If not following anyone, return empty posts array
      if (followingIds.length === 0) {
        postsQuery = postsQuery.eq('user_id', '00000000-0000-0000-0000-000000000000') // Will return no results
      } else {
        postsQuery = postsQuery.in('user_id', followingIds)
      }
    }

    // Get completed evaluations (limit to prevent excessive data)
    let evaluationsQuery = supabase
      .from('evaluations')
      .select('id, scout_id, player_id, status, notes, completed_at, created_at')
      .eq('status', 'completed')
      .not('notes', 'is', null)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(maxLimit)

    // If following mode, filter evaluations to only those involving followed users
    if (mode === 'following') {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', session.user.id)

      const followingIds = follows?.map(f => f.following_id) || []
      
      if (followingIds.length === 0) {
        evaluationsQuery = evaluationsQuery.eq('scout_id', '00000000-0000-0000-0000-000000000000')
      } else {
        evaluationsQuery = evaluationsQuery.or(`scout_id.in.(${followingIds.join(',')}),player_id.in.(${followingIds.join(',')})`)
      }
    }

    // Get blog posts (limit to prevent excessive data)
    let blogPostsQuery = supabase
      .from('blog_posts')
      .select('id, slug, title, excerpt, content, image, author, author_email, published_at, created_at, scout_id')
      .order('published_at', { ascending: false })
      .limit(maxLimit)

    // If following mode, filter blog posts to only those from followed users
    if (mode === 'following') {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', session.user.id)

      const followingIds = follows?.map(f => f.following_id) || []
      
      if (followingIds.length === 0) {
        blogPostsQuery = blogPostsQuery.eq('scout_id', '00000000-0000-0000-0000-000000000000')
      } else {
        blogPostsQuery = blogPostsQuery.in('scout_id', followingIds)
      }
    }

    // Execute all queries in parallel for better performance
    const [postsResult, evaluationsResult, blogPostsResult] = await Promise.all([
      postsQuery,
      evaluationsQuery,
      blogPostsQuery,
    ])

    const { data: posts, error: postsError } = postsResult
    const { data: evaluations, error: evaluationsError } = evaluationsResult
    const { data: blogPosts, error: blogPostsError } = blogPostsResult

    if (postsError) {
      console.error('Error fetching posts:', postsError)
      return handleApiError(postsError, 'Failed to fetch posts')
    }

    if (evaluationsError) {
      console.error('Error fetching evaluations:', evaluationsError)
      return handleApiError(evaluationsError, 'Failed to fetch evaluations')
    }

    if (blogPostsError) {
      console.error('Error fetching blog posts:', blogPostsError)
      return handleApiError(blogPostsError, 'Failed to fetch blog posts')
    }

    // Collect all unique user IDs for a single profile query (much faster than multiple queries)
    const allUserIds = new Set<string>()
    if (posts) posts.forEach(post => allUserIds.add(post.user_id))
    if (evaluations) {
      evaluations.forEach(evaluation => {
        if (evaluation.scout_id) allUserIds.add(evaluation.scout_id)
        if (evaluation.player_id) allUserIds.add(evaluation.player_id)
      })
    }
    if (blogPosts) {
      blogPosts.forEach(blog => {
        if (blog.scout_id) allUserIds.add(blog.scout_id)
      })
    }

    // Single profile query for all users (much faster than multiple queries)
    let profilesMap: Record<string, any> = {}
    if (allUserIds.size > 0) {
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, username, full_name, avatar_url, organization, school, position, graduation_year')
        .in('user_id', Array.from(allUserIds))

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        return handleApiError(profilesError, 'Failed to fetch profiles')
      }

      // Create a map for O(1) lookups
      allProfiles?.forEach(profile => {
        profilesMap[profile.user_id] = profile
      })
    }

    // Join posts with profiles
    const postsWithProfiles: any[] = (posts || []).map(post => ({
      ...post,
      profiles: profilesMap[post.user_id] || null,
    }))

    // Join evaluations with profiles (using the same profilesMap)
    const evaluationsWithProfiles: any[] = (evaluations || []).map(evaluation => ({
      ...evaluation,
      scout: profilesMap[evaluation.scout_id] || null,
      player: profilesMap[evaluation.player_id] || null,
    }))

    // Join blog posts with profiles (using the same profilesMap)
    const blogPostsWithProfiles: any[] = (blogPosts || []).map(blog => ({
      ...blog,
      profiles: profilesMap[blog.scout_id] || null,
    }))

    // Combine and sort chronologically by created_at/completed_at/published_at
    const feedItems = [
      ...postsWithProfiles.map(post => ({
        type: 'post' as const,
        id: post.id,
        created_at: post.created_at,
        data: post,
      })),
      ...evaluationsWithProfiles.map(evaluation => ({
        type: 'evaluation' as const,
        id: evaluation.id,
        created_at: evaluation.completed_at || evaluation.created_at,
        data: evaluation,
      })),
      ...blogPostsWithProfiles.map(blog => ({
        type: 'blog' as const,
        id: blog.id,
        created_at: blog.published_at || blog.created_at,
        data: blog,
      })),
    ].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateB - dateA // Newest first
    })

    // Return items with pagination info
    return successResponse({ 
      items: feedItems,
      hasMore: feedItems.length >= maxLimit,
      limit: maxLimit,
      offset: offset + feedItems.length
    })
  } catch (error: any) {
    console.error('Error fetching feed:', error)
    return handleApiError(error, 'Internal server error')
  }
}
