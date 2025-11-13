'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

interface NotificationIconProps {
  userId?: string | null
}

export default function NotificationIcon({ userId }: NotificationIconProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNotificationsPage, setIsNotificationsPage] = useState(false)
  
  // Use window.location instead of usePathname to avoid potential errors
  // Check pathname only after component mounts (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const checkPath = () => {
      try {
        const path = window.location?.pathname
        if (path) {
          setIsNotificationsPage(path === '/notifications')
        }
      } catch (error) {
        // Silently fail - just don't show border
      }
    }
    
    // Check on mount only - don't use intervals or event listeners to avoid errors
    checkPath()
  }, [])

  useEffect(() => {
    if (!userId || typeof window === 'undefined') {
      return
    }

    let isMounted = true
    let channel: any = null

    const supabase = createClient()

    const loadUnreadCount = async () => {
      if (!isMounted) return
      
      try {
        const query = supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('read', false)
        
        const { count, error } = await query

        if (!isMounted) return

        if (error) {
          // If table doesn't exist or other database error, silently fail
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            // Table doesn't exist - that's fine, just show icon with no badge
            setUnreadCount(0)
            return
          }
          // Other errors - log but don't break
          console.error('Error loading notification count:', error)
          setUnreadCount(0)
          return
        }
        setUnreadCount(count || 0)
      } catch (error: any) {
        // Handle any unexpected errors gracefully - just don't show badge
        if (!isMounted) return
        
        if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
          // Table doesn't exist - that's fine
          setUnreadCount(0)
        } else {
          console.error('Error loading notification count:', error)
          setUnreadCount(0)
        }
      }
    }

    // Load count initially - ensure all promises are caught
    loadUnreadCount().catch((error) => {
      // Silently ignore any uncaught promise errors
      if (isMounted) {
        setUnreadCount(0)
      }
    })

    // Temporarily disable real-time subscription to avoid uncaught promise errors
    // TODO: Re-enable once we can properly handle subscription promises
    // try {
    //   channel = supabase
    //     .channel(`notifications-count-${userId}`)
    //     .on(
    //       'postgres_changes',
    //       {
    //         event: '*',
    //         schema: 'public',
    //         table: 'notifications',
    //         filter: `user_id=eq.${userId}`,
    //       },
    //       () => {
    //         if (isMounted) {
    //           loadUnreadCount().catch(() => {
    //             // Silently ignore errors
    //           })
    //         }
    //       }
    //     )
    //     .subscribe()
    // } catch (error) {
    //   // If subscription setup fails, that's okay - just won't have real-time updates
    // }

    return () => {
      isMounted = false
      if (channel) {
        try {
          supabase.removeChannel(channel).catch(() => {
            // Ignore cleanup errors
          })
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  }, [userId])

  // Handle navigation manually to avoid Link errors
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      if (typeof window !== 'undefined') {
        window.location.href = '/notifications'
      }
    } catch (error) {
      // Silently ignore navigation errors
      console.warn('Navigation error:', error)
    }
  }

  // Always show the icon - render even if userId is null (will show but not functional)
  return (
    <a
      href="/notifications"
      onClick={handleClick}
      className="cursor-pointer hover:opacity-80 transition-opacity relative w-10 h-10 block"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <div
        className={`w-10 h-10 rounded-full overflow-hidden ${
          isNotificationsPage ? 'border-2 border-black p-0.5' : ''
        }`}
      >
        <div className="w-full h-full rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
          <svg
            className="w-6 h-6 text-black"
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
        </div>
      </div>
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-xs font-semibold text-white bg-red-600 rounded-full border-2 border-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </a>
  )
}

