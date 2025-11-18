import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isHighSchoolAdmin } from '@/lib/high-school/school'
import { cancelSchoolEval } from '@/lib/high-school/evaluations'

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

    // Cancel school-paid evaluation
    const result = await cancelSchoolEval(
      evaluationId,
      params.id,
      session.user.id
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to cancel evaluation' },
        { status: 400 }
      )
    }

    return successResponse({ success: true })
  } catch (error: any) {
    return handleApiError(error, 'Failed to cancel evaluation')
  }
}


