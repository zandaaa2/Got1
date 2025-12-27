import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'

/**
 * Gets the feed of posts and completed evaluations.
 * Supports "trending" (all posts) or "following" (posts from followed users only).
 * Returns chronologically sorted items (newest first).
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

    let postsQuery = supabase
      .from('posts')
      .select('id, user_id, content, image_url, video_url, video_thumbnail_url, created_at, updated_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

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

    const { data: posts, error: postsError } = await postsQuery

    if (postsError) {
      console.error('Error fetching posts:', postsError)
      return handleApiError(postsError, 'Failed to fetch posts')
    }

    // Fetch profiles for posts
    let postsWithProfiles = []
    if (posts && posts.length > 0) {
      const userIds = [...new Set(posts.map(post => post.user_id))]
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, username, full_name, avatar_url, organization, school, position')
        .in('user_id', userIds)

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        return handleApiError(profilesError, 'Failed to fetch profiles')
      }

      // Manually join posts with profiles
      postsWithProfiles = posts.map(post => ({
        ...post,
        profiles: profiles?.find(p => p.user_id === post.user_id) || null,
      }))
    }

    // Get completed evaluations
    let evaluationsQuery = supabase
      .from('evaluations')
      .select('id, scout_id, player_id, status, notes, completed_at, created_at')
      .eq('status', 'completed')
      .not('notes', 'is', null)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })

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

    const { data: evaluations, error: evaluationsError } = await evaluationsQuery

    if (evaluationsError) {
      console.error('Error fetching evaluations:', evaluationsError)
      return handleApiError(evaluationsError, 'Failed to fetch evaluations')
    }

    // Fetch profiles for evaluations
    let evaluationsWithProfiles = []
    if (evaluations && evaluations.length > 0) {
      const userIds = new Set<string>()
      evaluations.forEach(evaluation => {
        if (evaluation.scout_id) userIds.add(evaluation.scout_id)
        if (evaluation.player_id) userIds.add(evaluation.player_id)
      })

      const { data: evalProfiles, error: evalProfilesError } = await supabase
        .from('profiles')
        .select('id, user_id, username, full_name, avatar_url, organization, school, position, graduation_year')
        .in('user_id', Array.from(userIds))

      if (evalProfilesError) {
        console.error('Error fetching evaluation profiles:', evalProfilesError)
        return handleApiError(evalProfilesError, 'Failed to fetch evaluation profiles')
      }

      // Manually join evaluations with profiles
      evaluationsWithProfiles = evaluations.map(evaluation => ({
        ...evaluation,
        scout: evalProfiles?.find(p => p.user_id === evaluation.scout_id) || null,
        player: evalProfiles?.find(p => p.user_id === evaluation.player_id) || null,
      }))
    }

    // Get blog posts
    let blogPostsQuery = supabase
      .from('blog_posts')
      .select('id, slug, title, excerpt, content, image, author, author_email, published_at, created_at, scout_id')
      .order('published_at', { ascending: false })

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

    const { data: blogPosts, error: blogPostsError } = await blogPostsQuery

    if (blogPostsError) {
      console.error('Error fetching blog posts:', blogPostsError)
      return handleApiError(blogPostsError, 'Failed to fetch blog posts')
    }

    // Fetch profiles for blog posts
    let blogPostsWithProfiles = []
    if (blogPosts && blogPosts.length > 0) {
      const blogUserIds = [...new Set(blogPosts.map(blog => blog.scout_id).filter(Boolean))]
      const { data: blogProfiles, error: blogProfilesError } = await supabase
        .from('profiles')
        .select('id, user_id, username, full_name, avatar_url, organization, school, position')
        .in('user_id', blogUserIds)

      if (blogProfilesError) {
        console.error('Error fetching blog profiles:', blogProfilesError)
        return handleApiError(blogProfilesError, 'Failed to fetch blog profiles')
      }

      // Manually join blog posts with profiles
      blogPostsWithProfiles = blogPosts.map(blog => ({
        ...blog,
        profiles: blogProfiles?.find(p => p.user_id === blog.scout_id) || null,
      }))
    }

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

    return successResponse({ items: feedItems })
  } catch (error: any) {
    console.error('Error fetching feed:', error)
    return handleApiError(error, 'Internal server error')
  }
}
