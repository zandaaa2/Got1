import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@/lib/supabase'

/**
 * Check what data exists in auth.users vs profiles for specific users
 * Useful for debugging sync issues
 */
export async function POST(request: NextRequest) {
  try {
    const adminResult = await requireAdmin(request)
    if (adminResult.response) {
      return adminResult.response
    }
    const { supabase } = adminResult

    const { user_ids } = await request.json()

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ error: 'user_ids array required' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Admin client not configured' },
        { status: 500 }
      )
    }

    const results = []

    for (const userId of user_ids) {
      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, username, role')
        .eq('user_id', userId)
        .maybeSingle()

      // Get auth user
      const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(userId)

      results.push({
        user_id: userId,
        profile: profile || null,
        auth_user: user ? {
          email: user.email,
          user_metadata: user.user_metadata,
          raw_metadata: JSON.stringify(user.user_metadata, null, 2),
        } : null,
        auth_error: userError?.message || null,
        comparison: {
          name_in_profile: profile?.full_name || null,
          username: profile?.username || null,
          name_matches_username: profile?.full_name?.toLowerCase() === profile?.username?.toLowerCase(),
          name_in_auth: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name || null,
          avatar_in_profile: profile?.avatar_url || null,
          avatar_in_auth: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.photo_url || null,
          needs_sync: {
            name: (!profile?.full_name || 
                   profile.full_name.toLowerCase() === profile?.username?.toLowerCase()) && 
                   (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name) ? true : false,
            avatar: (!profile?.avatar_url && 
                    (user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.photo_url)) || false,
          },
        },
      })
    }

    return NextResponse.json({ results })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

