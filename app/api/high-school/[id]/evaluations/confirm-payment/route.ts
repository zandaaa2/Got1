import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isHighSchoolAdmin } from '@/lib/high-school/school'
import { confirmSchoolPayment } from '@/lib/high-school/evaluations'
import { createAdminClient } from '@/lib/supabase-admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

    // Check if user is admin of this school
    const isAdmin = await isHighSchoolAdmin(session.user.id, params.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be an admin of this school' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { evaluationId } = body

    if (!evaluationId) {
      return NextResponse.json(
        { error: 'Evaluation ID is required' },
        { status: 400 }
      )
    }

    // Get evaluation and school details
    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { data: evalRecord } = await adminSupabase
      .from('high_school_evaluations')
      .select(`
        evaluation:evaluations(*),
        schools:high_schools(stripe_account_id)
      `)
      .eq('evaluation_id', evaluationId)
      .eq('high_school_id', params.id)
      .maybeSingle()

    if (!evalRecord || !evalRecord.evaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      )
    }

    const school = evalRecord.schools as any
    const evaluation = evalRecord.evaluation as any

    // Create Stripe payment from school's account
    if (!school.stripe_account_id) {
      return NextResponse.json(
        { error: 'School does not have Stripe account set up' },
        { status: 400 }
      )
    }

    try {
      // Create payment intent with transfer to school's Connect account
      // Actually, we need to create a Checkout Session that transfers to school account
      // But for now, we'll create a direct charge
      // Note: This should be handled via Stripe Connect transfers
      
      // For now, mark as confirmed and handle payment later via webhook
      // TODO: Implement proper Stripe Connect payment flow
    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError)
      return NextResponse.json(
        { error: stripeError.message || 'Failed to process payment' },
        { status: 500 }
      )
    }

    // Confirm school payment (sends notifications)
    const result = await confirmSchoolPayment(
      evaluationId,
      params.id,
      session.user.id
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to confirm payment' },
        { status: 400 }
      )
    }

    return successResponse({ success: true })
  } catch (error: any) {
    return handleApiError(error, 'Failed to confirm school payment')
  }
}


