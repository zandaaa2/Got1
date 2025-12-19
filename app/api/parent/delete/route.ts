import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Deletes a parent account and handles cleanup:
 * - If parent tagged existing player: remove parent_children link, keep player profile
 * - If parent created player page: delete player profile as well
 */
export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    // Get parent profile
    const { data: parentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('role', 'parent')
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching parent profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch parent profile' }, { status: 500 })
    }

    if (!parentProfile) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 })
    }

    // Use admin client for deletion operations
    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Get all linked children
    const { data: parentLinks, error: linksError } = await adminSupabase
      .from('parent_children')
      .select('player_id')
      .eq('parent_id', session.user.id)

    if (linksError) {
      console.error('Error fetching parent links:', linksError)
      return NextResponse.json({ error: 'Failed to fetch linked players' }, { status: 500 })
    }

    // Process each linked player
    if (parentLinks && parentLinks.length > 0) {
      for (const link of parentLinks) {
        // Get player profile to check if it was created by parent
        const { data: playerProfile, error: playerError } = await adminSupabase
          .from('profiles')
          .select('id, created_by_parent')
          .eq('user_id', link.player_id)
          .eq('role', 'player')
          .maybeSingle()

        if (playerError) {
          console.error('Error fetching player profile:', playerError)
          continue
        }

        if (playerProfile) {
          if (playerProfile.created_by_parent) {
            // Parent created this player page - delete it
            const { error: deleteError } = await adminSupabase
              .from('profiles')
              .delete()
              .eq('id', playerProfile.id)

            if (deleteError) {
              console.error('Error deleting player profile:', deleteError)
            } else {
              console.log(`Deleted player profile ${playerProfile.id} (created by parent)`)
            }
          } else {
            // Parent only tagged existing player - just remove the link
            // Player profile remains
            console.log(`Keeping player profile ${playerProfile.id} (tagged existing)`)
          }
        }

        // Delete parent_children relationship
        const { error: deleteLinkError } = await adminSupabase
          .from('parent_children')
          .delete()
          .eq('parent_id', session.user.id)
          .eq('player_id', link.player_id)

        if (deleteLinkError) {
          console.error('Error deleting parent_children link:', deleteLinkError)
        }
      }
    }

    // Delete parent profile
    const { error: deleteParentError } = await adminSupabase
      .from('profiles')
      .delete()
      .eq('user_id', session.user.id)

    if (deleteParentError) {
      console.error('Error deleting parent profile:', deleteParentError)
      return handleApiError(deleteParentError, 'Failed to delete parent profile')
    }

    // Note: We don't delete the auth user - that should be handled separately
    // or by Supabase's CASCADE if configured

    return successResponse({ 
      success: true,
      message: 'Parent account deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting parent account:', error)
    return handleApiError(error, 'Internal server error')
  }
}




















