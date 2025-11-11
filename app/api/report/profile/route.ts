import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import { sendProfileReportEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { profileId, reason } = body || {}

    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error reporting profile:', error)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}
