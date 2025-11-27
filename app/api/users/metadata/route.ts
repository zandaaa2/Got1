import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API route to fetch user metadata (name, avatar) from auth.users
 * This is needed because we can't query auth.users directly from client-side
 */
export async function POST(request: NextRequest) {
  try {
    const { user_ids } = await request.json()

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ error: 'user_ids array required' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    const metadataMap: Record<string, { full_name?: string | null; avatar_url?: string | null }> = {}

    // Fetch user metadata for each user_id using admin client
    for (const userId of user_ids) {
      try {
        const { data: { user }, error } = await adminClient.auth.admin.getUserById(userId)
        if (!error && user) {
          metadataMap[userId] = {
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          }
        }
      } catch (err) {
        // Skip if we can't access this user's metadata
        console.warn(`Could not fetch metadata for user ${userId}:`, err)
      }
    }

    return NextResponse.json({ metadata: metadataMap })
  } catch (error: any) {
    console.error('Error fetching user metadata:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch metadata' }, { status: 500 })
  }
}

