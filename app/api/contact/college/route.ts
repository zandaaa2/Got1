import { NextResponse } from 'next/server'
import { sendCollegeContactEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, college, position, message } = body || {}

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, and message are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    await sendCollegeContactEmail({
      name,
      email,
      college: college || undefined,
      position: position || undefined,
      message,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending college contact email:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

