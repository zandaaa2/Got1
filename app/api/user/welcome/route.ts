import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

/**
 * Sends a welcome email to a new user.
 * 
 * @param request - Next.js request object containing userEmail and userName
 * @returns Success or error response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userEmail, userName } = body

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Missing userEmail' },
        { status: 400 }
      )
    }

    await sendWelcomeEmail(userEmail, userName || 'there')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending welcome email:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

