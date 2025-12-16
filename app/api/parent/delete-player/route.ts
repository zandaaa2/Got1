import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Deletes a player profile that was created by a parent
 * This deletes the profile, auth user, and parent_children link
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    // Verify user is a parent
    const { data: parentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'parent')
      .maybeSingle()

    if (!parentProfile) {
      return NextResponse.json({ error: 'Only parents can delete player profiles' }, { status: 403 })
    }

    const body = await request.json()
    const { player_id } = body

    if (!player_id) {
      return NextResponse.json({ error: 'player_id is required' }, { status: 400 })
    }

    // Use admin client for deletion operations
    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Get player profile
    const { data: playerProfile, error: playerError } = await adminSupabase
      .from('profiles')
      .select('id, user_id')
      .eq('user_id', player_id)
      .eq('role', 'player')
      .maybeSingle()

    if (playerError) {
      console.error('Error fetching player profile:', playerError)
      return handleApiError(playerError, 'Failed to fetch player profile')
    }

    if (!playerProfile) {
      return NextResponse.json({ error: 'Player profile not found' }, { status: 404 })
    }

    // Verify parent is linked to this player
    const { data: parentLink } = await adminSupabase
      .from('parent_children')
      .select('id')
      .eq('parent_id', session.user.id)
      .eq('player_id', player_id)
      .maybeSingle()

    if (!parentLink) {
      return NextResponse.json({ 
        error: 'You are not authorized to delete this player' 
      }, { status: 403 })
    }

    // Delete parent_children relationship first
    const { error: deleteLinkError } = await adminSupabase
      .from('parent_children')
      .delete()
      .eq('parent_id', session.user.id)
      .eq('player_id', player_id)

    if (deleteLinkError) {
      console.error('Error deleting parent_children link:', deleteLinkError)
      return handleApiError(deleteLinkError, 'Failed to unlink player')
    }

    // Delete player profile
    const { error: deleteProfileError } = await adminSupabase
      .from('profiles')
      .delete()
      .eq('id', playerProfile.id)

    if (deleteProfileError) {
      console.error('Error deleting player profile:', deleteProfileError)
      return handleApiError(deleteProfileError, 'Failed to delete player profile')
    }

    // Delete auth user (this will cascade delete the profile if CASCADE is set, but we already deleted it)
    try {
      await adminSupabase.auth.admin.deleteUser(player_id)
      console.log('✅ Deleted auth user for player:', player_id)
    } catch (deleteUserError: any) {
      console.error('Error deleting auth user (profile already deleted):', deleteUserError)
      // Don't fail if user deletion fails - profile is already deleted
    }

    return successResponse({
      success: true,
      message: 'Player profile deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting player profile:', error)
    return handleApiError(error, 'Internal server error')
  }
}
