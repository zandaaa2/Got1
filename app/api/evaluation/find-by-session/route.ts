import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

/**
 * Finds an evaluation by Stripe checkout session ID.
 * Used after payment success to redirect to the evaluation page.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    console.log('🔍 Finding evaluation for session:', sessionId)
    
    // Get the Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)

    console.log('📦 Stripe session retrieved:', {
      id: checkoutSession.id,
      payment_status: checkoutSession.payment_status,
      metadata: checkoutSession.metadata,
      payment_intent: checkoutSession.payment_intent,
    })

    if (!checkoutSession || checkoutSession.payment_status !== 'paid') {
      console.error('❌ Payment not completed:', {
        payment_status: checkoutSession?.payment_status,
        session_exists: !!checkoutSession,
      })
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      )
    }

    // Get metadata from session
    const scoutId = checkoutSession.metadata?.scout_id
    const playerId = checkoutSession.metadata?.player_id

    console.log('🔍 Metadata from session:', { scoutId, playerId, currentUserId: session.user.id })

    // Verify the player matches the current user
    if (playerId !== session.user.id) {
      console.error('❌ Player ID mismatch:', {
        playerIdFromMetadata: playerId,
        currentUserId: session.user.id,
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Find evaluation by payment_intent_id (most reliable)
    // Or by scout_id + player_id + recent payment (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    console.log('🔍 Looking for evaluation created after:', fiveMinutesAgo)
    
    let evaluation = null
    
    // Method 1: Find by payment_intent_id (MOST RELIABLE - unique per payment)
    // Use admin client first to bypass RLS
    if (checkoutSession.payment_intent) {
      console.log('🔍 Method 1: Looking by payment_intent_id (admin client):', checkoutSession.payment_intent)
      const adminSupabase = createAdminClient()
      if (adminSupabase) {
        const { data: evalByPayment, error: evalByPaymentError } = await adminSupabase
          .from('evaluations')
          .select('id, status, payment_status, created_at, player_id, scout_id')
          .eq('payment_intent_id', checkoutSession.payment_intent as string)
          .maybeSingle()
        
        console.log('📦 Result by payment_intent (admin):', {
          found: !!evalByPayment,
          evaluation_id: evalByPayment?.id,
          player_id: evalByPayment?.player_id,
          expected_player_id: playerId,
          error: evalByPaymentError,
        })
        
        // Verify player matches (security check)
        if (evalByPayment && evalByPayment.player_id === playerId) {
          evaluation = evalByPayment
          console.log('✅ Found evaluation via payment_intent_id (admin)')
        } else if (evalByPayment) {
          console.error('❌ Player ID mismatch:', {
            found: evalByPayment.player_id,
            expected: playerId,
          })
        }
      } else {
        console.error('❌ Admin client not available')
      }
    }

    // Method 1b: If not found with admin, try with regular client (RLS might allow it)
    if (!evaluation && checkoutSession.payment_intent) {
      console.log('🔍 Method 1b: Trying with regular client...')
      const { data: evalByPaymentUser } = await supabase
        .from('evaluations')
        .select('id, status, payment_status, created_at')
        .eq('payment_intent_id', checkoutSession.payment_intent as string)
        .maybeSingle()
      
      if (evalByPaymentUser) {
        evaluation = evalByPaymentUser
        console.log('✅ Found evaluation via payment_intent_id (regular client)')
      }
    }

    // If not found by payment_intent, find by scout + player + recent payment
    if (!evaluation && scoutId && playerId) {
      console.log('🔍 Method 2: Looking by scout_id + player_id + recent payment')
      const { data: evalByScoutPlayer, error: evalByScoutPlayerError } = await supabase
        .from('evaluations')
        .select('id, created_at, status, payment_status')
        .eq('scout_id', scoutId)
        .eq('player_id', playerId)
        .eq('payment_status', 'paid')
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log('📦 Result by scout+player+recent:', {
        found: !!evalByScoutPlayer,
        evaluation: evalByScoutPlayer,
        error: evalByScoutPlayerError,
      })

      if (evalByScoutPlayer) {
        evaluation = evalByScoutPlayer
      }
    }

    if (!evaluation) {
      console.error('❌ Evaluation not found after all methods')
      // Try one more time with admin client and broader search
      const adminSupabase = createAdminClient()
      if (adminSupabase && scoutId && playerId) {
        console.log('🔍 Method 3: Admin client broad search (last 10 minutes)')
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
        const { data: adminEvals } = await adminSupabase
          .from('evaluations')
          .select('id, status, payment_status, created_at')
          .eq('scout_id', scoutId)
          .eq('player_id', playerId)
          .gte('created_at', tenMinutesAgo)
          .order('created_at', { ascending: false })
          .limit(5)
        
        console.log('📦 Admin broad search result:', adminEvals)
        
        if (adminEvals && adminEvals.length > 0) {
          evaluation = adminEvals[0]
          console.log('✅ Found evaluation via admin broad search:', evaluation.id)
        }
      }
    }

    if (!evaluation) {
      console.error('❌ Final: Evaluation not found. It may still be processing.')
      return NextResponse.json(
        { 
          error: 'Evaluation not found. It may still be processing.',
          debug: {
            session_id: sessionId,
            scout_id: scoutId,
            player_id: playerId,
            payment_intent: checkoutSession.payment_intent,
            five_minutes_ago: fiveMinutesAgo,
          },
        },
        { status: 404 }
      )
    }

    console.log('✅ Found evaluation:', evaluation.id)
    return successResponse({ evaluationId: evaluation.id })
  } catch (error: any) {
    console.error('Error finding evaluation by session:', error)
    return handleApiError(error, 'Internal server error')
  }
}

export const dynamic = 'force-dynamic'

