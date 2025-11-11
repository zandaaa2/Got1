import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendPolicyUpdateEmail } from '@/lib/email'
import { POLICIES_METADATA, PolicyKey } from '@/lib/policies'

export const dynamic = 'force-dynamic'

interface RequestBody {
  policies?: string[]
  note?: string
}

const DEFAULT_PER_PAGE = 500

function validateAuthorization(request: Request) {
  const expectedSecret = process.env.POLICY_NOTIFY_SECRET
  if (!expectedSecret) {
    console.warn('POLICY_NOTIFY_SECRET is not configured. Blocking policy notification trigger for security.')
    return { ok: false, status: 500, message: 'Policy notification secret not configured on server.' }
  }

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
  if (token !== expectedSecret) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }
  return { ok: true, status: 200, message: 'Authorized' }
}

export async function POST(request: Request) {
  const authCheck = validateAuthorization(request)
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.message }, { status: authCheck.status })
  }

  let body: RequestBody = {}
  try {
    body = (await request.json()) || {}
  } catch (error) {
    console.warn('Policy notify endpoint received invalid JSON body, defaulting to empty payload.')
  }

  const selectedKeys: PolicyKey[] = Array.isArray(body.policies) && body.policies.length
    ? body.policies.filter((key): key is PolicyKey => key in POLICIES_METADATA)
    : (Object.keys(POLICIES_METADATA) as PolicyKey[])

  if (!selectedKeys.length) {
    return NextResponse.json({ error: 'No valid policy keys supplied.' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ error: 'Admin client not configured.' }, { status: 500 })
  }

  let page = 1
  const perPage = DEFAULT_PER_PAGE
  let totalProcessed = 0
  let totalSent = 0
  const failures: { email?: string | null; reason: string }[] = []

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('Failed to list users on page', page, error)
      return NextResponse.json({ error: 'Failed to list users.', details: error.message }, { status: 500 })
    }

    const users = data?.users || []
    if (!users.length) {
      break
    }

    for (const user of users) {
      totalProcessed += 1
      const email = user.email
      if (!email) {
        failures.push({ reason: 'Missing email on auth user', email })
        continue
      }

      try {
        await sendPolicyUpdateEmail(email, { policies: selectedKeys, note: body.note })
        totalSent += 1
      } catch (error: any) {
        console.error('Failed to send policy update email to', email, error)
        failures.push({ email, reason: error?.message || 'Unknown error' })
      }
    }

    if (users.length < perPage) {
      break
    }

    page += 1
  }

  return NextResponse.json({
    message: 'Policy update notification processed',
    totalProcessed,
    totalSent,
    failures,
  })
}
