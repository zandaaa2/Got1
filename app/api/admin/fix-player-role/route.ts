import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Utility endpoint to check and fix a player's role
 * Usage: POST /api/admin/fix-player-role with body: { full_name: "Harrison Houch" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { full_name } = body

    if (!full_name) {
      return NextResponse.json({ error: 'full_name is required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Find the profile by name
    const { data: profiles, error: searchError } = await adminSupabase
      .from('profiles')
      .select('id, user_id, full_name, role, username, hudl_link, position, school')
      .ilike('full_name', `%${full_name}%`)

    if (searchError) {
      return NextResponse.json({ error: searchError.message }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: `No profile found with name containing "${full_name}"` }, { status: 404 })
    }

    const results = []

    for (const profile of profiles) {
      const needsFix = profile.role !== 'player'
      const hasPlayerData = !!(profile.hudl_link || profile.position || profile.school)

      if (needsFix) {
        // Validate full_name is required before setting role to 'player'
        if (!profile.full_name || profile.full_name.trim() === '') {
          results.push({
            profile_id: profile.id,
            full_name: profile.full_name,
            old_role: profile.role,
            new_role: 'player',
            status: 'error',
            error: 'Cannot set role to player without a full_name. Full name is required.'
          })
          continue
        }

        // Update role to 'player'
        const { data: updated, error: updateError } = await adminSupabase
          .from('profiles')
          .update({ role: 'player' })
          .eq('user_id', profile.user_id)
          .select()
          .single()

        if (updateError) {
          results.push({
            profile_id: profile.id,
            full_name: profile.full_name,
            old_role: profile.role,
            new_role: 'player',
            status: 'error',
            error: updateError.message
          })
        } else {
          results.push({
            profile_id: profile.id,
            full_name: profile.full_name,
            old_role: profile.role,
            new_role: updated.role,
            status: 'fixed',
            has_player_data: hasPlayerData
          })
        }
      } else {
        results.push({
          profile_id: profile.id,
          full_name: profile.full_name,
          role: profile.role,
          status: 'already_correct',
          has_player_data: hasPlayerData
        })
      }
    }

    return NextResponse.json({
      message: `Found ${profiles.length} profile(s)`,
      results
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
