import { createRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAdmin } from '@/lib/admin'

/**
 * API route to lift a scout's suspension immediately.
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

    // Get the scout's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Lift suspension by clearing suspended_until and suspended_reason
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        suspended_until: null,
        suspended_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error lifting suspension:', updateError)
      return NextResponse.json(
        { error: 'Failed to lift suspension' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error lifting suspension:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

