'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import Modal from '@/components/shared/Modal'
import Logo from '@/components/shared/Logo'

interface SidebarProps {
  activePage?: 'home' | 'discover' | 'browse' | 'my-evals' | 'notifications' | 'profile' | 'make-money' | 'help' | 'settings'
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
    pathname === '/home' ? 'home' :
    pathname === '/discover' || pathname === '/browse' || pathname === '/whats-this' ? 'discover' :
    pathname === '/my-evals' ? 'my-evals' :
    pathname === '/profile' ? 'profile' :
    pathname === '/notifications' ? 'notifications' :
    pathname === '/make-money' ? 'make-money' :
    pathname === '/help' ? 'help' :
    pathname === '/settings' ? 'settings' :
    undefined
  )
  
  // Check if mobile viewport
  const [isMobile, setIsMobile] = useState(false)
  
  // Get user ID and role
  // Re-check when pathname changes (e.g., after sign-in redirect)
  useEffect(() => {
    const supabase = createClient()
    
    const loadUserData = async (retryCount = 0) => {
      try {
        // Try getUser() first as it's more reliable for checking auth state
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          // If getUser fails, fall back to getSession
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error('Error getting session in Sidebar:', sessionError)
            // If both fail and we haven't retried, try again
            if (retryCount < 3) {
              console.log(`⏳ Sidebar: Auth check failed, retrying (${retryCount + 1}/3)...`)
              setTimeout(() => {
                loadUserData(retryCount + 1)
              }, 500)
              return
            }
            // Clear user data if auth fails after retries
            setUserId(null)
            setUserEmail(null)
            setUserRole(null)
            return
          }
          
          if (session?.user?.id) {
            console.log('✅ Sidebar: Session found via getSession, user ID:', session.user.id)
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
            return
          }
        }
        
        // If getUser succeeded
        if (user?.id) {
          console.log('✅ Sidebar: User found via getUser, user ID:', user.id)
          setUserId(user.id)
          setUserEmail(user.email || null)
          
          // Get user's role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (profile) {
            setUserRole(profile.role)
          }
        } else {
          // If no user found but we haven't retried, try again after a delay
          // This handles the case where cookies are still being set after redirect
          if (retryCount < 3) {
            console.log(`⏳ Sidebar: No user yet, retrying (${retryCount + 1}/3)...`)
            setTimeout(() => {
              loadUserData(retryCount + 1)
            }, 500)
            return
          }
          
          // Clear user data if no user after retries
          console.log('⚠️ Sidebar: No user found after retries')
          setUserId(null)
          setUserEmail(null)
          setUserRole(null)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
        // Retry on error
        if (retryCount < 3) {
          setTimeout(() => {
            loadUserData(retryCount + 1)
          }, 500)
        }
      }
    }
    
    // Initial load with a small delay to allow cookies to propagate after redirect
    // Then check immediately and with retries
    const timeoutId = setTimeout(() => {
      loadUserData()
    }, 100)
    
    // Also set up an auth state change listener to update when session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Sidebar: Auth state changed:', event, session?.user?.id || 'no session')
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUserData(0) // Reset retry count
      } else if (event === 'SIGNED_OUT') {
        setUserId(null)
        setUserEmail(null)
        setUserRole(null)
      }
    })
    
    // Also check when window regains focus (in case session became available)
    const handleFocus = () => {
      loadUserData(0)
    }
    window.addEventListener('focus', handleFocus)
    
    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
      window.removeEventListener('focus', handleFocus)
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
        <Logo
          variant="regular"
          width={isCollapsed ? 40 : 100}
          height={isCollapsed ? 40 : 28}
          linkToHome={true}
        />
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
          {/* Home */}
          <Link
            href="/home"
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal ${
              currentActivePage === 'home'
                ? 'bg-gray-100 text-black'
                : 'text-black hover:bg-gray-50'
            } ${!isCollapsed ? '' : 'justify-center'}`}
            title={!isCollapsed ? undefined : 'Home'}
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {!isCollapsed && <span>Home</span>}
          </Link>

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

          {/* My Evals - Always show (middleware will handle auth) */}
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

          {/* Notifications - Always show (middleware will handle auth) */}
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

          {/* Profile - Always show (middleware will handle auth) */}
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

          {/* Settings - Always show (middleware will handle auth) */}
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal ${
              currentActivePage === 'settings'
                ? 'bg-gray-100 text-black'
                : 'text-black hover:bg-gray-50'
            } ${!isCollapsed ? '' : 'justify-center'}`}
            title={!isCollapsed ? undefined : 'Settings'}
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {!isCollapsed && <span>Settings</span>}
          </Link>
        </nav>
      </div>

    </aside>
    </>
  )
}

