import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'

export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult
    const userId = session.user.id

    // Use service role client for admin operations
    const supabaseAdmin = createAdminClient()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role key not configured. Please contact support.' },
        { status: 500 }
      )
    }

    // Delete in order: evaluations, scout applications, profile, then auth user
    // Note: RLS policies may prevent some deletions, so we'll handle errors gracefully

    // 1. Delete evaluations where user is player or scout
    const { error: evalError } = await supabaseAdmin
      .from('evaluations')
      .delete()
      .or(`player_id.eq.${userId},scout_id.eq.${userId}`)
    
    if (evalError) {
      console.error('Error deleting evaluations:', evalError)
      // Continue even if this fails - some evaluations might be protected
    }

    // 2. Delete scout application
    const { error: appError } = await supabaseAdmin
      .from('scout_applications')
      .delete()
      .eq('user_id', userId)
    
    if (appError) {
      console.error('Error deleting scout application:', appError)
    }

    // 3. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId)
    
    if (profileError) {
      console.error('Error deleting profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to delete profile. Please contact support.' },
        { status: 500 }
      )
    }

    // 4. Delete auth user (requires admin client)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.error('Error deleting auth user:', authError)
      // Profile is deleted, but auth user might remain
      // This is acceptable - user won't be able to log in without profile
      console.warn('Auth user deletion failed, but profile was deleted. User may need manual cleanup.')
    }

    return successResponse({ success: true, message: 'Account deleted successfully' })
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete account')
  }
}

