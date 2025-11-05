import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendEvaluationCompleteEmail } from '@/lib/email'
import { getUserEmail } from '@/lib/supabase-admin'

/**
 * Sends an email notification when an evaluation is completed.
 * This is called after the evaluation status is updated to 'completed'.
 * 
 * @param request - Next.js request object containing evaluationId
 * @returns Success or error response
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { evaluationId } = body

    if (!evaluationId) {
      return NextResponse.json(
        { error: 'Missing evaluationId' },
        { status: 400 }
      )
    }

    // Get evaluation with profiles
    const { data: evaluation } = await supabase
      .from('evaluations')
      .select('*')
      .eq('id', evaluationId)
      .maybeSingle()

    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
    }

    // Verify the user submitting is the scout
    if (evaluation.scout_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get player profile
    const { data: playerProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', evaluation.player_id)
      .maybeSingle()

    if (!playerProfile) {
      return NextResponse.json({ error: 'Player profile not found' }, { status: 404 })
    }

    // Get scout profile
    const { data: scoutProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', evaluation.scout_id)
      .maybeSingle()

    // Get player's email
    const playerEmail = await getUserEmail(evaluation.player_id)

    // Send email notification to player
    if (playerEmail) {
      try {
        await sendEvaluationCompleteEmail(
          playerEmail,
          playerProfile.full_name || 'Player',
          scoutProfile?.full_name || 'Scout',
          evaluationId
        )
      } catch (emailError) {
        console.error('Error sending evaluation complete email:', emailError)
        // Don't fail the request if email fails
      }
    } else {
      console.log('⚠️  Could not send evaluation complete email - player email not available (SUPABASE_SERVICE_ROLE_KEY may not be configured)')
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in evaluation complete email:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

