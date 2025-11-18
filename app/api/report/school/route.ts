import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

    const body = await request.json()
    const { schoolId, schoolUsername, schoolName, reason } = body || {}

    if (!schoolId || !schoolName) {
      return NextResponse.json({ error: 'Missing school information' }, { status: 400 })
    }

    const reporterEmail = session.user.email || 'Unknown'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://got1.app'
    const schoolUrl = schoolUsername 
      ? `${baseUrl}/high-school/${schoolUsername}`
      : `${baseUrl}/high-school/${schoolId}`

    // Send email report
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #000; margin-bottom: 20px;">School Page Report</h2>
        <p style="color: #333; line-height: 1.6; margin-bottom: 16px;">
          A school page has been reported on Got1.
        </p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 8px 0;"><strong>Reported School:</strong> ${schoolName}</p>
          <p style="margin: 8px 0;"><strong>School URL:</strong> <a href="${schoolUrl}" style="color: #000;">${schoolUrl}</a></p>
          <p style="margin: 8px 0;"><strong>Reporter Email:</strong> ${reporterEmail}</p>
        </div>
        ${reason ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #000; margin-bottom: 10px;">Report Reason</h3>
            <p style="color: #333; line-height: 1.6; white-space: pre-line;">${reason}</p>
          </div>
        ` : ''}
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Please review this school page and take any necessary action.
        </p>
      </div>
    `

    await sendEmail('zander@got1.app', `School Page Report: ${schoolName}`, html)

    return successResponse({ success: true })
  } catch (error: any) {
    return handleApiError(error, 'Failed to submit report')
  }
}

