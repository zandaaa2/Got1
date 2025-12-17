import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createNotification } from '@/lib/notifications'

/**
 * Allows a scout to give a free evaluation to a player.
 * Creates an evaluation with price = 0 and status = 'in_progress'.
 * Scout can then write and submit the evaluation.
 * 
 * @param request - Next.js request object containing playerId
 * @returns Evaluation ID or error response
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const body = await request.json()
    const { playerId } = body

    if (!playerId) {
      return NextResponse.json(
        { error: 'Missing playerId' },
        { status: 400 }
      )
    }

    // Get current user's profile to verify they're a scout
    const { data: scoutProfile, error: scoutProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (scoutProfileError) {
      console.error('Error fetching scout profile:', scoutProfileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    if (!scoutProfile || scoutProfile.role !== 'scout') {
      return NextResponse.json({ 
        error: 'Only scouts can give free evaluations' 
      }, { status: 403 })
    }

    // Get player profile
    const { data: playerProfile, error: playerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', playerId)
      .maybeSingle()

    if (playerError) {
      console.error('Error fetching player:', playerError)
      return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 })
    }

    if (!playerProfile || playerProfile.role !== 'player') {
      return NextResponse.json({ error: 'Invalid player' }, { status: 400 })
    }

    // Prevent scout from giving eval to themselves
    if (playerProfile.user_id === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot give an evaluation to yourself' },
        { status: 400 }
      )
    }

    // Check if evaluation already exists
    const { data: existingEvaluation } = await supabase
      .from('evaluations')
      .select('id, status')
      .eq('scout_id', session.user.id)
      .eq('player_id', playerProfile.user_id)
      .in('status', ['pending', 'confirmed', 'in_progress', 'completed'])
      .maybeSingle()

    if (existingEvaluation) {
      // If already completed, return the existing evaluation
      if (existingEvaluation.status === 'completed') {
        return NextResponse.json(
          { 
            error: 'Evaluation already completed',
            evaluationId: existingEvaluation.id
          },
          { status: 400 }
        )
      }
      // If in progress, return the existing evaluation ID so scout can continue
      return successResponse({ 
        evaluationId: existingEvaluation.id,
        alreadyExists: true
      })
    }

    // Create free evaluation with price = 0
    const { data: evaluation, error: evalError } = await supabase
      .from('evaluations')
      .insert({
        scout_id: session.user.id,
        player_id: playerProfile.user_id,
        status: 'in_progress',
        price: 0,
        payment_status: 'paid', // Free evals are considered "paid" (no payment needed)
      })
      .select()
      .single()

    if (evalError || !evaluation) {
      console.error('Error creating free evaluation:', evalError)
      return handleApiError(evalError, 'Failed to create evaluation')
    }

    // Create notification for player
    try {
      await createNotification({
        userId: playerProfile.user_id,
        type: 'evaluation_requested',
        title: 'New Free Evaluation',
        message: `${scoutProfile.full_name || 'A scout'} is giving you a free evaluation!`,
        link: `/evaluations/${evaluation.id}`,
        metadata: {
          evaluation_id: evaluation.id,
          scout_id: session.user.id,
        },
      })
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError)
      // Don't fail the request if notification fails
    }

    return successResponse({ 
      success: true,
      evaluationId: evaluation.id
    })
  } catch (error: any) {
    console.error('Error giving free evaluation:', error)
    return handleApiError(error, 'Internal server error')
  }
}



