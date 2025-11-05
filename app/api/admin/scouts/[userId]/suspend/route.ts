import { createRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAdmin } from '@/lib/admin'

/**
 * API route to suspend a scout for a specified number of days.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient(() => cookieStore)

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    const userIsAdmin = await isAdmin(session.user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId } = params
    const body = await request.json()
    const { days, reason } = body

    if (!days || typeof days !== 'number' || days < 1) {
      return NextResponse.json(
        { error: 'Invalid number of days' },
        { status: 400 }
      )
    }

    // Get the scout's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role !== 'scout') {
      return NextResponse.json(
        { error: 'User is not a scout' },
        { status: 400 }
      )
    }

    // Calculate suspension end date
    const suspendedUntil = new Date()
    suspendedUntil.setDate(suspendedUntil.getDate() + days)

    // Update profile with suspension
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        suspended_until: suspendedUntil.toISOString(),
        suspended_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error suspending scout:', updateError)
      return NextResponse.json(
        { error: 'Failed to suspend scout' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      suspended_until: suspendedUntil.toISOString(),
    })
  } catch (error: any) {
    console.error('Error suspending scout:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

