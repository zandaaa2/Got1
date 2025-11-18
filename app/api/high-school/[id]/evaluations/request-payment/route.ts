import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { requestSchoolPayment } from '@/lib/high-school/evaluations'

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

    const body = await request.json()
    const { evaluationId } = body

    if (!evaluationId) {
      return NextResponse.json(
        { error: 'Evaluation ID is required' },
        { status: 400 }
      )
    }

    // Request school payment
    const result = await requestSchoolPayment(
      evaluationId,
      params.id,
      session.user.id
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to request school payment' },
        { status: 400 }
      )
    }

    return successResponse({ success: true })
  } catch (error: any) {
    return handleApiError(error, 'Failed to request school payment')
  }
}


