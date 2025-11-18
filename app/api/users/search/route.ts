import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }

    const { supabase } = authResult
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return successResponse({ users: [] })
    }

    console.log('🔍 API: Searching for users with query:', query)
    
    // Search users by full_name or username
    // Use ilike for case-insensitive search
    // Supabase or() syntax: "column.operator.value,column.operator.value"
    const searchPattern = `%${query}%`
    
    // Query profiles matching either full_name or username
    // Exclude players (only return scouts and basic users)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, username, role, avatar_url')
      .or(`full_name.ilike.${searchPattern},username.ilike.${searchPattern}`)
      .neq('role', 'player')
      .limit(10)

    if (error) {
      console.error('❌ API: Search error:', error)
      return handleApiError(error, 'Failed to search users')
    }

    console.log('✅ API: Search query:', query, 'Found profiles:', profiles?.length || 0, profiles)

    // For each profile, try to get the email from auth.users
    // Since we can't query auth.users directly from client, we'll return what we have
    // The frontend can use the user_id or email they type
    const users = (profiles || []).map(profile => ({
      user_id: profile.user_id,
      full_name: profile.full_name,
      username: profile.username,
      avatar_url: profile.avatar_url,
    }))

    return successResponse({ users })
  } catch (error: any) {
    console.error('❌ API: Search API error:', error)
    return handleApiError(error, 'Failed to search users')
  }
}

