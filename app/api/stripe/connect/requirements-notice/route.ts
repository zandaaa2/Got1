import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { sendStripeRequirementsEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const requirementsDue: string[] = body.requirementsDue || []
    const requirementsPastDue: string[] = body.requirementsPastDue || []

    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, stripe_account_id')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (profileError) {
      return handleApiError(profileError, 'Failed to load profile')
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

    return successResponse({ success: true })
  } catch (error: any) {
    return handleApiError(error, 'Failed to send email')
  }
}


