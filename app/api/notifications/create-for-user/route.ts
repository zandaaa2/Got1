import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-helpers'
import { createNotification } from '@/lib/notifications'

/**
 * API route for creating notifications for a specific user (not the authenticated user).
 * Requires authentication and creates a notification for the targetUserId.
 * Used for notifying content creators when someone likes/comments on their content.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }

    const body = await request.json()
    const { targetUserId, type, title, message, link, metadata } = body

    if (!targetUserId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: targetUserId, type, title, and message are required' },
        { status: 400 }
      )
    }

    const success = await createNotification({
      userId: targetUserId,
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

