import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * Track an evaluation view (increment view_count)
 * This is a lightweight endpoint that can be called frequently
 * It's safe to call multiple times - it just increments a counter
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const evaluationId = params.id

    if (!evaluationId) {
      return NextResponse.json(
        { error: 'Evaluation ID is required' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Increment view_count atomically
    const { error } = await adminSupabase.rpc('increment_evaluation_view_count', {
      evaluation_id: evaluationId,
    })

    // If RPC function doesn't exist, fall back to manual increment
    if (error && error.code === '42883') {
      // Get current count and increment
      const { data: evaluation } = await adminSupabase
        .from('evaluations')
        .select('view_count')
        .eq('id', evaluationId)
        .single()

      const newCount = (evaluation?.view_count || 0) + 1

      const { error: updateError } = await adminSupabase
        .from('evaluations')
        .update({ view_count: newCount })
        .eq('id', evaluationId)

      if (updateError) {
        console.error('Error updating evaluation view count:', updateError)
        return NextResponse.json(
          { error: 'Failed to update view count' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, view_count: newCount })
    }

    if (error) {
      console.error('Error incrementing evaluation view count:', error)
      return NextResponse.json(
        { error: 'Failed to increment view count' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error tracking evaluation view:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
