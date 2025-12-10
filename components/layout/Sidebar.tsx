'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import Modal from '@/components/shared/Modal'

interface SidebarProps {
  activePage?: 'discover' | 'browse' | 'my-evals' | 'notifications' | 'profile' | 'make-money' | 'help'
  onToggle?: (isCollapsed: boolean) => void
}

export default function Sidebar({ activePage, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed')
      return saved === 'true'
    }
    return false
  })
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  
  // Determine active page from pathname if not provided as prop
  // Map 'browse' to 'discover' for internal consistency
  const normalizedActivePage = activePage === 'browse' ? 'discover' : activePage
  const currentActivePage = normalizedActivePage || (
    pathname === '/discover' || pathname === '/browse' || pathname === '/whats-this' ? 'discover' :
    pathname === '/my-evals' ? 'my-evals' :
    pathname === '/profile' ? 'profile' :
    pathname === '/notifications' ? 'notifications' :
    pathname === '/make-money' ? 'make-money' :
    pathname === '/help' ? 'help' :
    undefined
  )
  
  // Check if mobile viewport
  const [isMobile, setIsMobile] = useState(false)
  
  // Get user ID and role
  // Re-check when pathname changes (e.g., after sign-in redirect)
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user?.id) {
          setUserId(session.user.id)
          setUserEmail(session.user.email || null)
          
          // Get user's role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle()
          
          if (profile) {
            setUserRole(profile.role)
          }
        } else {
          // Clear user data if no session
          setUserId(null)
          setUserEmail(null)
          setUserRole(null)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      }
    }
    
    loadUserData()
    
    // Also set up an auth state change listener to update when session changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUserData()
      } else if (event === 'SIGNED_OUT') {
        setUserId(null)
        setUserEmail(null)
        setUserRole(null)
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [pathname]) // Re-check when pathname changes (e.g., after sign-in)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false) // Close mobile menu when resizing to desktop
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', String(isCollapsed))
      onToggle?.(isCollapsed)
      // Dispatch custom event for other components to listen to
      window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { isCollapsed } }))
    }
  }, [isCollapsed, onToggle])

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const PRIMARY_LOGO_SRC = '/got1-logos/wide.png'
  const COMPACT_LOGO_SRC = '/got1-logos/number.png'

  return (
    <>
      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 bottom-0 bg-white border-r border-gray-200 transition-all duration-300 z-50 flex-col ${
          isCollapsed
            ? 'w-24'
            : 'w-64'
        }`}
      >
      <div className={`p-4 md:p-6 flex-shrink-0 ${!isCollapsed ? 'flex items-center justify-between' : 'flex flex-col items-center gap-4'}`}>
        <Link 
          href="/" 
          className="hover:opacity-70 transition-opacity"
        >
          <Image
            src={!isCollapsed ? PRIMARY_LOGO_SRC : COMPACT_LOGO_SRC}
            alt="Got1"
            width={isCollapsed ? 48 : 140}
            height={isCollapsed ? 48 : 40}
            className="object-contain"
            priority
          />
        </Link>
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <svg
              className="w-5 h-5 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          )}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-0">
        <nav className="space-y-2">
          {/* Browse */}
          <Link
            href="/browse"
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal ${
              currentActivePage === 'discover'
                ? 'bg-gray-100 text-black'
                : 'text-black hover:bg-gray-50'
            } ${!isCollapsed ? '' : 'justify-center'}`}
            title={!isCollapsed ? undefined : 'Browse'}
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {!isCollapsed && <span>Browse</span>}
          </Link>

          {/* My Evals - Only show if signed in */}
          {userId && (
            <Link
              href="/my-evals"
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal ${
                currentActivePage === 'my-evals'
                  ? 'bg-gray-100 text-black'
                  : 'text-black hover:bg-gray-50'
              } ${!isCollapsed ? '' : 'justify-center'}`}
              title={!isCollapsed ? undefined : 'My Evals'}
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              {!isCollapsed && <span>My Evals</span>}
            </Link>
          )}

          {/* Notifications - Only show if signed in */}
          {userId && (
            <Link
              href="/notifications"
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal relative ${
                currentActivePage === 'notifications'
                  ? 'bg-gray-100 text-black'
                  : 'text-black hover:bg-gray-50'
              } ${!isCollapsed ? '' : 'justify-center'}`}
              title={!isCollapsed ? undefined : 'Notifications'}
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
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
              {!isCollapsed && <span>Notifications</span>}
            </Link>
          )}

          {/* Profile - Only show if signed in */}
          {userId && (
            <Link
              href="/profile"
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal ${
                currentActivePage === 'profile'
                  ? 'bg-gray-100 text-black'
                  : 'text-black hover:bg-gray-50'
              } ${!isCollapsed ? '' : 'justify-center'}`}
              title={!isCollapsed ? undefined : 'Profile'}
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {!isCollapsed && <span>Profile</span>}
            </Link>
          )}
        </nav>
      </div>

    </aside>
    </>
  )
}

