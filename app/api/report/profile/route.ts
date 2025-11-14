import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { sendProfileReportEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const body = await request.json()
    const { profileId, reason } = body || {}

    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
    }

    const { data: reportedProfile, error: reportedError } = await supabase
      .from('profiles')
      .select('id, full_name, username, role, user_id')
      .eq('id', profileId)
      .maybeSingle()

    if (reportedError || !reportedProfile) {
      console.error('Error fetching reported profile:', reportedError)
      return NextResponse.json({ error: 'Could not find reported profile' }, { status: 404 })
    }

    const { data: reporterProfile } = await supabase
      .from('profiles')
      .select('id, full_name, username, role')
      .eq('user_id', session.user.id)
      .maybeSingle()

    const reporterEmail = session.user.email || null

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://got1.app'
    const profileUrl = reportedProfile.username
      ? `${baseUrl}/${reportedProfile.username}`
      : `${baseUrl}/profile/${reportedProfile.id}`

    await sendProfileReportEmail({
      reportedProfile,
      reporterProfile: {
        id: reporterProfile?.id || null,
        full_name: reporterProfile?.full_name || null,
        username: reporterProfile?.username || null,
        role: reporterProfile?.role || null,
      },
      reporterEmail,
      reason: typeof reason === 'string' ? reason.slice(0, 2000) : '',
      profileUrl,
    })

    return successResponse({ success: true })
  } catch (error: any) {
    return handleApiError(error, 'Failed to submit report')
  }
}
