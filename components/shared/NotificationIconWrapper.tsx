'use client'

import { Component, ReactNode, useState, useEffect } from 'react'
import NotificationIcon from './NotificationIcon'

interface NotificationIconWrapperProps {
  userId?: string | null
}

interface ErrorBoundaryState {
  hasError: boolean
}

class NotificationIconErrorBoundary extends Component<
  { children: ReactNode; userId?: string | null },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; userId?: string | null }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('NotificationIcon error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // If there's an error (e.g., usePathname failed), show a simple fallback
      // This ensures the icon is always visible even if there's an error
      return <NotificationIconFallback userId={this.props.userId} />
    }

    return this.props.children
  }
  
  // Reset error state when userId changes (component might work now)
  componentDidUpdate(prevProps: { children: ReactNode; userId?: string | null }, prevState: ErrorBoundaryState) {
    if (prevProps.userId !== this.props.userId && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }
}

// Simple fallback component that doesn't use Next.js hooks
// This is used when NotificationIcon throws an error (e.g., usePathname fails)
function NotificationIconFallback({ userId }: { userId?: string | null }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNotificationsPage, setIsNotificationsPage] = useState(false)
  
  // Check if we're on the notifications page using window.location (no Next.js hooks)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsNotificationsPage(window.location.pathname === '/notifications')
      
      // Listen for route changes
      const checkPath = () => {
        setIsNotificationsPage(window.location.pathname === '/notifications')
      }
      window.addEventListener('popstate', checkPath)
      return () => window.removeEventListener('popstate', checkPath)
    }
  }, [])
  
  // Load unread count if userId is available
  useEffect(() => {
    if (!userId || typeof window === 'undefined') {
      return
    }
    
    // Dynamically import createClient to avoid SSR issues
    const loadUnreadCount = async () => {
      try {
        const { createClient } = await import('@/lib/supabase-client')
        const supabase = createClient()
        
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('read', false)
        
        if (error) {
          // Silently fail if table doesn't exist
          if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
            console.error('Error loading notification count:', error)
          }
          setUnreadCount(0)
          return
        }
        setUnreadCount(count || 0)
      } catch (error) {
        // Ignore errors
        setUnreadCount(0)
      }
    }
    
    loadUnreadCount()
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
    }
  }

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

export default function NotificationIconWrapper({ userId }: NotificationIconWrapperProps) {
  // Temporarily use fallback directly to avoid any errors
  // Once stable, we can switch back to the full NotificationIcon with error boundary
  return <NotificationIconFallback userId={userId} />
  
  // Original code with error boundary (commented out for now):
  // return (
  //   <NotificationIconErrorBoundary userId={userId}>
  //     <NotificationIcon userId={userId} />
  //   </NotificationIconErrorBoundary>
  // )
}

