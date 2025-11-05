import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendEvaluationRequestEmail } from '@/lib/email'
import { getUserEmail } from '@/lib/supabase-admin'

/**
 * Creates a new evaluation without payment processing.
 * This is a simplified version for testing before Stripe integration.
 * 
 * @param request - Next.js request object containing scoutId and price
 * @returns Evaluation ID or error response
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
    const { scoutId, price } = body

    if (!scoutId || !price) {
      return NextResponse.json(
        { error: 'Missing scoutId or price' },
        { status: 400 }
      )
    }

    // Get scout profile
    const { data: scout, error: scoutError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', scoutId)
      .maybeSingle()

    if (scoutError) {
      console.error('Error fetching scout:', scoutError)
      return NextResponse.json({ error: 'Failed to fetch scout' }, { status: 500 })
    }

    if (!scout || scout.role !== 'scout') {
      return NextResponse.json({ error: 'Invalid scout' }, { status: 400 })
    }

    // Get player profile
    const { data: player, error: playerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (playerError) {
      console.error('Error fetching player:', playerError)
      return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 })
    }

    if (!player || player.role !== 'player') {
      return NextResponse.json({ error: 'Invalid player' }, { status: 400 })
    }

    // Check if evaluation already exists
    const { data: existingEvaluation } = await supabase
      .from('evaluations')
      .select('id')
      .eq('scout_id', scout.user_id)
      .eq('player_id', player.user_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingEvaluation) {
      return NextResponse.json(
        { error: 'Evaluation already pending', evaluationId: existingEvaluation.id },
        { status: 400 }
      )
    }

    // Create evaluation record (status: 'pending' - waiting for scout to complete)
    const { data: evaluation, error: evalError } = await supabase
      .from('evaluations')
      .insert({
        scout_id: scout.user_id,
        player_id: player.user_id,
        status: 'pending',
        price: typeof price === 'string' ? parseFloat(price) : price,
      })
      .select()
      .maybeSingle()

    if (evalError) {
      console.error('Error creating evaluation:', evalError)
      console.error('Error code:', evalError.code)
      console.error('Error message:', evalError.message)
      console.error('Error details:', JSON.stringify(evalError, null, 2))
      console.error('Scout user_id:', scout.user_id)
      console.error('Player user_id:', player.user_id)
      console.error('Price:', typeof price === 'string' ? parseFloat(price) : price)
      return NextResponse.json(
        { 
          error: 'Failed to create evaluation', 
          details: evalError.message,
          code: evalError.code,
          hint: evalError.hint || 'Check RLS policies for evaluations table'
        },
        { status: 500 }
      )
    }

    if (!evaluation) {
      return NextResponse.json(
        { error: 'Failed to create evaluation - no data returned' },
        { status: 500 }
      )
    }

    // Send email notification to scout
    try {
      const scoutEmail = await getUserEmail(scout.user_id)
      
      if (scoutEmail) {
        await sendEvaluationRequestEmail(
          scoutEmail,
          scout.full_name || 'Scout',
          player.full_name || 'Player',
          player.school || null,
          evaluation.id,
          typeof price === 'string' ? parseFloat(price) : price
        )
      } else {
        console.log('⚠️  Could not send evaluation request email - scout email not available (SUPABASE_SERVICE_ROLE_KEY may not be configured)')
      }
    } catch (emailError) {
      console.error('Error sending evaluation request email:', emailError)
      // Don't fail the request if email fails
    }

    console.log('✅ Evaluation created successfully:', evaluation.id)
    return NextResponse.json({ 
      success: true, 
      evaluationId: evaluation.id,
      evaluation 
    })
  } catch (error: any) {
    console.error('Error creating evaluation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

