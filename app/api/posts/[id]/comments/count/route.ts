import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'

/**
 * GET: Get comment count for a post
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

    // Get count of non-deleted comments
    const { count, error: countError } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .is('deleted_at', null)

    if (countError) {
      console.error('Error fetching comment count:', countError)
      return handleApiError(countError, 'Failed to fetch comment count')
    }

    return successResponse({ count: count || 0 })
  } catch (error: any) {
    console.error('Error in GET /api/posts/[id]/comments/count:', error)
    return handleApiError(error, 'Internal server error')
  }
}

export const dynamic = 'force-dynamic'
