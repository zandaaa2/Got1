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
    const { message } = body

    if (!message || typeof message !== 'string') {
      console.error('❌ Invalid message:', message)
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (message.length > 80) {
      console.error('❌ Message too long:', message.length)
      return NextResponse.json(
        { error: 'Message must be 80 characters or less' },
        { status: 400 }
      )
    }

    // Get user info if available (optional auth for feature requests)
    // Feature requests can be submitted anonymously, so we don't require auth
    const authResult = await requireAuth(request)
    const userEmail = authResult.response ? 'Anonymous' : (authResult.session?.user?.email || 'Anonymous')
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    console.log('📧 Sending email to zander@got1.app')
    console.log('📧 From user:', userEmail)
    console.log('📧 Message:', message)

    // Send email to zander@got1.app
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@got1.app'
    const replyTo = 'zander@got1.app'
    
    console.log('📧 From email:', fromEmail)
    console.log('📧 Reply to:', replyTo)
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      reply_to: replyTo,
      to: 'zander@got1.app',
      subject: 'Feature Request from Got1',
      headers: {
        'X-Entity-Ref-ID': `feature-request-${Date.now()}`,
      },
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #000; padding-bottom: 10px;">
            New Feature Request
          </h2>
          <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #000;">
            <p style="font-size: 16px; color: #333; margin: 0;">
              "${message}"
            </p>
          </div>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p><strong>Submitted by:</strong> ${userEmail}</p>
            <p><strong>User Agent:</strong> ${userAgent}</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
      text: `New Feature Request\n\n"${message}"\n\nSubmitted by: ${userEmail}\nTimestamp: ${new Date().toLocaleString()}`,
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

