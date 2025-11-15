import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-helpers'
import { createNotification } from '@/lib/notifications'

/**
 * API route for creating notifications from client-side components.
 * Requires authentication and creates a notification for the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

    const body = await request.json()
    const { type, title, message, link, metadata } = body

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, and message are required' },
        { status: 400 }
      )
    }

    const success = await createNotification({
      userId: session.user.id,
      type,
      title,
      message,
      link,
      metadata,
    })

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

