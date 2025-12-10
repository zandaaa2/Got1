import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Feature request API called')
    
    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    console.log('📧 Request body:', body)
    const { featureTitle, description } = body

    if (!featureTitle || typeof featureTitle !== 'string' || !featureTitle.trim()) {
      console.error('❌ Invalid feature title:', featureTitle)
      return NextResponse.json(
        { error: 'Feature title is required' },
        { status: 400 }
      )
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      console.error('❌ Invalid description:', description)
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Get user info - feature requests require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    
    const userEmail = authResult.session?.user?.email || 'Unknown'
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    console.log('📧 Sending email to zander@got1.app')
    console.log('📧 From user:', userEmail)
    console.log('📧 Feature title:', featureTitle)
    console.log('📧 Description:', description)

    // Send email to zander@got1.app
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@got1.app'
    const replyTo = userEmail
    
    console.log('📧 From email:', fromEmail)
    console.log('📧 Reply to:', replyTo)
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      reply_to: replyTo,
      to: 'zander@got1.app',
      subject: `Feature Request: ${featureTitle}`,
      headers: {
        'X-Entity-Ref-ID': `feature-request-${Date.now()}`,
      },
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #000; padding-bottom: 10px;">
            New Feature Request
          </h2>
          <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #000;">
            <h3 style="font-size: 18px; color: #000; margin: 0 0 10px 0; font-weight: bold;">
              ${featureTitle}
            </h3>
            <p style="font-size: 16px; color: #333; margin: 0; white-space: pre-wrap;">
              ${description}
            </p>
          </div>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p><strong>Submitted by:</strong> ${userEmail}</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
      text: `New Feature Request\n\nTitle: ${featureTitle}\n\nDescription:\n${description}\n\nSubmitted by: ${userEmail}\nTimestamp: ${new Date().toLocaleString()}`,
    })

    if (error) {
      console.error('❌ Resend error:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: `Failed to send email: ${error.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    console.log('✅ Feature request email sent successfully')
    console.log('✅ Email ID:', data?.id)
    if (data?.id) {
      console.log('✅ Check delivery at: https://resend.com/emails/' + data.id)
    }

    return successResponse({ success: true, message: 'Feature request submitted successfully' })
  } catch (error: any) {
    console.error('❌ Error submitting feature request:', error)
    console.error('❌ Error stack:', error.stack)
    return handleApiError(error, 'Failed to submit feature request')
  }
}

