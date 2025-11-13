import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Track evaluation shares for analytics
 * POST /api/evaluations/[id]/share
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    
    // Check authentication (optional - allow anonymous shares from public page)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const body = await request.json()
    const { platform } = body

    if (!platform || !['twitter', 'copy_link', 'direct'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      )
    }

    // Verify evaluation exists and is completed
    const { data: evaluation } = await supabase
      .from('evaluations')
      .select('player_id, scout_id, status')
      .eq('id', params.id)
      .maybeSingle()

    if (!evaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      )
    }

    // Only allow sharing completed evaluations
    if (evaluation.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only share completed evaluations' },
        { status: 400 }
      )
    }

    // If user is authenticated, verify they have access OR they're viewing the public share page
    // For public shares (from /share/[token] page), we allow tracking even if they're not the owner
    if (session) {
      const isPlayer = evaluation.player_id === session.user.id
      const isScout = evaluation.scout_id === session.user.id
      
      // If user is authenticated but not owner, still allow tracking (they might be viewing public page)
      // We'll just track it with their user_id
    }

    // Use admin client to insert share record
    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get metadata (referrer, user agent, etc.)
    const referrer = request.headers.get('referer') || null
    const userAgent = request.headers.get('user-agent') || null

    // For anonymous shares, we can track with null shared_by, or skip tracking entirely
    // Let's track with the user_id if authenticated, null if anonymous
    const { error: shareError } = await adminSupabase
      .from('evaluation_shares')
      .insert({
        evaluation_id: params.id,
        shared_by: session?.user.id || null, // null for anonymous shares
        platform,
        metadata: {
          referrer,
          user_agent: userAgent,
          anonymous: !session,
        },
      })

    if (shareError) {
      console.error('Error tracking share:', shareError)
      return NextResponse.json(
        { error: 'Failed to track share' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in share tracking:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

