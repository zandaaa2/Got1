import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Test endpoint to view all notifications for the logged-in user
 * Access at: /api/test/notifications
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all notifications for the current user
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      // If table doesn't exist, return helpful message
      if (error.code === '42P01') {
        return NextResponse.json({
          error: 'Notifications table does not exist',
          message: 'Please run create-notifications-table.sql in Supabase SQL Editor first',
          user_id: session.user.id,
          email: session.user.email,
        }, { status: 404 })
      }
      
      console.error('Error fetching notifications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message },
        { status: 500 }
      )
    }

    // Get unread count
    const unreadCount = notifications?.filter(n => !n.read).length || 0

    return NextResponse.json({
      user_id: session.user.id,
      email: session.user.email,
      total_notifications: notifications?.length || 0,
      unread_count: unreadCount,
      notifications: notifications || [],
    })
  } catch (error: any) {
    console.error('Error in test notifications endpoint:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

