import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * Track a profile view (increment view_count)
 * This is a lightweight endpoint that can be called frequently
 * It's safe to call multiple times - it just increments a counter
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profileId = params.id

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
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
    const { error } = await adminSupabase.rpc('increment_profile_view_count', {
      profile_id: profileId,
    })

    // If RPC function doesn't exist, fall back to manual increment
    if (error && error.code === '42883') {
      // Get current count and increment
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('view_count')
        .eq('id', profileId)
        .single()

      const newCount = (profile?.view_count || 0) + 1

      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({ view_count: newCount })
        .eq('id', profileId)

      if (updateError) {
        console.error('Error updating view count:', updateError)
        return NextResponse.json(
          { error: 'Failed to update view count' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, view_count: newCount })
    }

    if (error) {
      console.error('Error incrementing view count:', error)
      return NextResponse.json(
        { error: 'Failed to increment view count' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error tracking profile view:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

