import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Claim submission API called')
    
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    
    const { session, supabase } = authResult
    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get user profile to get username and user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, user_id, full_name')
      .eq('user_id', session.user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    const username = profile.username || 'No username'
    const accountId = profile.user_id
    const fullName = profile.full_name || 'Unknown'

    console.log('📧 Sending claim email to zander@got1.app')
    console.log('📧 Username:', username)
    console.log('📧 Account ID:', accountId)
    console.log('📧 Message length:', message.trim().length)

    // Create email HTML
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #000; padding-bottom: 10px;">
          New Claim Submission
        </h2>
        <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #000;">
          <h3 style="font-size: 18px; color: #000; margin: 0 0 10px 0; font-weight: bold;">
            Claim Details
          </h3>
          <p style="font-size: 16px; color: #333; margin: 0; white-space: pre-wrap;">
            ${message.trim()}
          </p>
        </div>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #333;">
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Account ID:</strong> ${accountId}</p>
          <p><strong>Full Name:</strong> ${fullName}</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `

    // Send email to zander@got1.app
    await sendEmail(
      'zander@got1.app',
      'New Claim Submission',
      html
    )

    console.log('✅ Claim email sent successfully')

    return successResponse({ success: true, message: 'Claim submitted successfully' })
  } catch (error: any) {
    console.error('❌ Error submitting claim:', error)
    return handleApiError(error, 'Failed to submit claim')
  }
}

