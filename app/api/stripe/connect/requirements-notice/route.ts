import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import type { NextRequest } from 'next/server'
import { sendStripeRequirementsEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const requirementsDue: string[] = body.requirementsDue || []
    const requirementsPastDue: string[] = body.requirementsPastDue || []

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient(() => cookieStore)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, stripe_account_id')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
    }

    if (!profile?.stripe_account_id) {
      return NextResponse.json({ error: 'Stripe account not found' }, { status: 400 })
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData?.user?.email) {
      return NextResponse.json({ error: 'Email not available' }, { status: 400 })
    }

    await sendStripeRequirementsEmail(
      userData.user.email,
      profile.full_name || 'there',
      requirementsDue,
      requirementsPastDue
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending Stripe requirements email:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}


