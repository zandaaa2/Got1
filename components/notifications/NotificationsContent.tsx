'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
  metadata: Record<string, any> | null
}

export default function NotificationsContent({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasTableError, setHasTableError] = useState(false)
  const router = useRouter()
  const channelRef = useRef<any>(null) // RealtimeChannel type from @supabase/supabase-js
  const tableExistsRef = useRef<boolean | null>(null)

  useEffect(() => {
    let isMounted = true
    const supabase = createClient()

    const loadNotifications = async () => {
      try {
        if (!isMounted) return
        
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!isMounted) return

        if (error) {
          // If table doesn't exist, show empty state gracefully
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            console.warn('Notifications table does not exist. Please run the SQL migration.')
            setHasTableError(true)
            tableExistsRef.current = false
            setNotifications([])
            setUnreadCount(0)
            setLoading(false)
            return
          }
          // For other errors, log but don't crash
          console.error('Error loading notifications:', error)
          setNotifications([])
          setUnreadCount(0)
          setLoading(false)
          return
        }
        
        // Success - table exists
        setHasTableError(false)
        tableExistsRef.current = true

        setNotifications(data || [])
        setUnreadCount(data?.filter(n => !n.read).length || 0)
        setLoading(false)
      } catch (error: any) {
        if (!isMounted) return
        
        // Handle any unexpected errors gracefully
        if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
          console.warn('Notifications table does not exist. Please run the SQL migration.')
          setHasTableError(true)
          tableExistsRef.current = false
        } else {
          console.error('Error loading notifications:', error)
        }
        setNotifications([])
        setUnreadCount(0)
        setLoading(false)
      }
    }

    loadNotifications()
    
    // Set up real-time subscription only if table exists
    // Use a ref to track table existence to avoid dependency issues
    const setupSubscription = async () => {
      // Check if table exists (wait a bit for initial load to complete)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      if (!isMounted) return
      
      // If we already know table doesn't exist, skip subscription
      if (tableExistsRef.current === false) {
        return
      }
      
      try {
        // Test if table exists with a simple query
        const { error: testError } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .limit(1)
        
        // If table doesn't exist, don't set up subscription
        if (testError && (testError.code === '42P01' || testError.message?.includes('does not exist'))) {
          setHasTableError(true)
          tableExistsRef.current = false
          return
        }

        // Table exists, set up subscription
        if (isMounted) {
          const channel = supabase
            .channel(`notifications-${userId}-${Date.now()}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
              },
              () => {
                if (isMounted) {
                  loadNotifications()
                }
              }
            )
            .subscribe()
          
          channelRef.current = channel
        }
      } catch (error) {
        // If subscription setup fails, continue without real-time updates
        console.warn('Could not set up real-time notifications subscription:', error)
      }
    }
    
    // Set up subscription after initial load
    setupSubscription()

    return () => {
      isMounted = false
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
          channelRef.current = null
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  }, [userId])

  const markAsRead = async (notificationId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Notifications table does not exist')
          return
        }
        throw error
      }
      
      // Optimistically update UI
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      
      // Reload notifications to ensure consistency
      const { data, error: reloadError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (!reloadError && data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.read).length)
      }
    } catch (error: any) {
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('Notifications table does not exist')
      } else {
        console.error('Error marking notification as read:', error)
      }
    }
  }

  const markAllAsRead = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Notifications table does not exist')
          return
        }
        throw error
      }
      
      // Optimistically update UI
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      
      // Reload notifications to ensure consistency
      const { data, error: reloadError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (!reloadError && data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.read).length)
      }
    } catch (error: any) {
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('Notifications table does not exist')
      } else {
        console.error('Error marking all as read:', error)
      }
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Notifications table does not exist')
          return
        }
        throw error
      }
      
      // Optimistically update UI
      const notification = notifications.find(n => n.id === notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      
      // Reload notifications to ensure consistency
      const { data, error: reloadError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (!reloadError && data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.read).length)
      }
    } catch (error: any) {
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('Notifications table does not exist')
      } else {
        console.error('Error deleting notification:', error)
      }
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'evaluation_requested':
      case 'evaluation_confirmed':
      case 'evaluation_completed':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'evaluation_denied':
      case 'evaluation_cancelled':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'scout_application_approved':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'scout_application_denied':
        return (
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      case 'payment_received':
      case 'payment_failed':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading notifications...</div>
  }

  // Check if we're in an error state (table doesn't exist)
  const hasError = notifications.length === 0 && !loading

  return (
    <div className="mx-auto w-full max-w-5xl">
      {notifications.length > 0 && unreadCount > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Mark all as read
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <p className="text-lg font-medium text-gray-900 mb-2">No notifications</p>
          <p className="text-sm text-gray-600">
            {hasTableError 
              ? 'Notifications table not set up yet. Please run the database migration.' 
              : "You're all caught up!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-lg transition-colors ${
                notification.read
                  ? 'bg-white border border-gray-200 hover:bg-gray-50'
                  : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(notification.type)}
              </div>
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-black text-base md:text-lg mb-1">
                      {notification.title}
                    </h3>
                    <p className="text-black text-sm md:text-base mb-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteNotification(notification.id)
                }}
                className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                aria-label="Delete notification"
              >
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

