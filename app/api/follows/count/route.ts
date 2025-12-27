import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getApiSupabaseClient, handleApiError, successResponse } from '@/lib/api-helpers'

/**
 * Gets the follower count for a specific user.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getApiSupabaseClient()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      )
    }

    // Count followers (users who follow this userId)
    const { count, error: countError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId)

    if (countError) {
      console.error('Error counting followers:', countError)
      return handleApiError(countError, 'Failed to count followers')
    }

    return successResponse({ followerCount: count || 0 })
  } catch (error: any) {
    console.error('Error getting follower count:', error)
    return handleApiError(error, 'Internal server error')
  }
}
