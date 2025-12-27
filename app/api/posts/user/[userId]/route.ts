import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { handleApiError, successResponse, getApiSupabaseClient } from '@/lib/api-helpers'

/**
 * GET: Get all posts for a specific user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
  try {
    // Handle Next.js 15 async params
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.userId
    
    if (!userId) {
      console.error('❌ Missing userId parameter')
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    // Allow unauthenticated access to view posts (posts are public)
    const supabase = getApiSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    console.log('📝 Fetching posts for user:', userId)
    console.log('📝 User ID type:', typeof userId)
    if (session) {
      console.log('📝 Current session user ID:', session.user.id)
    } else {
      console.log('📝 No session - fetching posts as anonymous user')
    }

    // First, let's check if there are ANY posts in the database (for debugging)
    const { count: totalPostsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
    console.log('📝 Total posts in database:', totalPostsCount)

    // Check posts for this specific user_id
    const { count: userPostsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    console.log('📝 Posts for this user_id:', userPostsCount)

    // Get posts for the user (non-deleted only)
    // Note: pinned column may not exist, so we'll query without it and add it as false in the response
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, user_id, content, image_url, video_url, video_thumbnail_url, created_at, updated_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (postsError) {
      console.error('❌ Error fetching posts:', postsError)
      console.error('❌ Error code:', postsError.code)
      console.error('❌ Error message:', postsError.message)
      console.error('❌ Error details:', postsError.details)
      console.error('❌ Error hint:', postsError.hint)
      console.error('❌ Full error:', JSON.stringify(postsError, null, 2))
      return handleApiError(postsError, `Failed to fetch posts: ${postsError.message || 'Unknown error'}`)
    }

    console.log('✅ Posts fetched:', posts?.length || 0, 'posts for user', userId)
    if (posts && posts.length > 0) {
      console.log('📝 First post:', posts[0])
    } else {
      console.log('⚠️ No posts returned - checking if RLS policy is blocking')
    }

    // Get profile for the user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id, username, full_name, avatar_url, organization, school, position')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
    }

    // Join posts with profile
    // Note: pinned column may not exist, so we default it to false
    const postsWithProfile = (posts || []).map(post => ({
      ...post,
      pinned: false, // Default to false if column doesn't exist
      profiles: profile || null,
    }))

    return successResponse({ posts: postsWithProfile })
  } catch (error: any) {
    console.error('Error in GET /api/posts/user/[userId]:', error)
    return handleApiError(error, 'Internal server error')
  }
}

export const dynamic = 'force-dynamic'
