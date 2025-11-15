import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Debug endpoint to check if an evaluation exists for a user.
 * Usage: /api/debug/check-evaluation?scout_id=xxx&player_id=yyy
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const searchParams = request.nextUrl.searchParams
    const scoutId = searchParams.get('scout_id')
    const playerId = searchParams.get('player_id')

    if (!scoutId || !playerId) {
      return NextResponse.json(
        { error: 'Missing scout_id or player_id' },
        { status: 400 }
      )
    }

    // Check with regular client (RLS applies)
    const { data: evaluations, error: evalError } = await supabase
      .from('evaluations')
      .select('*')
      .eq('scout_id', scoutId)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Also check with admin client (bypasses RLS)
    const adminSupabase = createAdminClient()
    let adminEvaluations = null
    let adminError = null
    if (adminSupabase) {
      const result = await adminSupabase
        .from('evaluations')
        .select('*')
        .eq('scout_id', scoutId)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(10)
      adminEvaluations = result.data
      adminError = result.error
    }

    return successResponse({
      user_id: session.user.id,
      scout_id: scoutId,
      player_id: playerId,
      evaluations_with_rls: evaluations || [],
      evaluations_count_with_rls: evaluations?.length || 0,
      rls_error: evalError?.message || null,
      evaluations_without_rls: adminEvaluations || [],
      evaluations_count_without_rls: adminEvaluations?.length || 0,
      admin_error: adminError?.message || null,
      note: 'If evaluations_without_rls has more items than evaluations_with_rls, there is an RLS issue',
    })
  } catch (error: any) {
    console.error('Error checking evaluation:', error)
    return handleApiError(error, 'Internal server error')
  }
}

export const dynamic = 'force-dynamic'

