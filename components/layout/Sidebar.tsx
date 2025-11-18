'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

interface SidebarProps {
  activePage?: 'whats-this' | 'browse' | 'my-evals' | 'profile' | 'notifications' | 'high-school-billing'
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
  const [userSchool, setUserSchool] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('user-school')
        return cached ? JSON.parse(cached) : null
      } catch (error) {
        console.error('Failed to read cached user school:', error)
        return null
      }
    }
    return null
  })
  const [userId, setUserId] = useState<string | null>(null)
  
  // Check if mobile viewport
  const [isMobile, setIsMobile] = useState(false)
  
  // Load user's school if they're an admin (client-side)
  useEffect(() => {
    const loadUserSchool = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user?.id) {
          setUserId(session.user.id)
          
          // Check if user is an admin of a school (client-side query)
          const { data: adminData } = await supabase
            .from('high_school_admins')
            .select(`
              high_school_id,
              schools:high_schools (
                id,
                username,
                name,
                admin_status
              )
            `)
            .eq('user_id', session.user.id)
            .maybeSingle()
          
          if (adminData && adminData.schools) {
            const school = adminData.schools as any
            const schoolInfo = {
              id: school.id,
              username: school.username,
              name: school.name,
              admin_status: school.admin_status,
            }
            setUserSchool(schoolInfo)
            try {
              sessionStorage.setItem('user-school', JSON.stringify(schoolInfo))
            } catch (error) {
              console.error('Failed to cache user school:', error)
            }
          } else {
            setUserSchool(null)
            try {
              sessionStorage.removeItem('user-school')
            } catch (error) {
              console.error('Failed to clear cached user school:', error)
            }
          }
        }
      } catch (error) {
        console.error('Error loading user school:', error)
      }
    }
    
    loadUserSchool()
  }, [])
  
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
      {/* Mobile overlay */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 bg-white border-r border-gray-200 transition-all duration-300 z-50 ${
          isMobile
            ? isMobileOpen
              ? 'w-64 translate-x-0'
              : '-translate-x-full'
            : isCollapsed
            ? 'w-24'
            : 'w-64'
        } p-4 md:p-6`}
      >
      <div className={`mb-6 md:mb-8 ${isMobile || !isCollapsed ? 'flex items-center justify-between' : 'flex flex-col items-center gap-4'}`}>
        <Link 
          href="/" 
          className="hover:opacity-70 transition-opacity"
          onClick={() => isMobile && setIsMobileOpen(false)}
        >
          <Image
            src={(isMobile || !isCollapsed) ? PRIMARY_LOGO_SRC : COMPACT_LOGO_SRC}
            alt="Got1"
            width={isMobile ? 120 : isCollapsed ? 48 : 140}
            height={isMobile ? 32 : isCollapsed ? 48 : 40}
            className="object-contain"
            priority
          />
        </Link>
        <button
          onClick={() => {
            if (isMobile) {
              setIsMobileOpen(false)
            } else {
              toggleSidebar()
            }
          }}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label={isMobile ? 'Close menu' : isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isMobile ? (
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : isCollapsed ? (
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
      
      <div className="mb-6">
        {(isMobile || !isCollapsed) && (
          <h2 className="text-sm font-semibold text-black mb-4">Discover</h2>
        )}
        <nav className="space-y-2">
          <Link
            href="/whats-this"
            onClick={() => isMobile && setIsMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal ${
              activePage === 'whats-this'
                ? 'bg-gray-100 text-black'
                : 'text-black hover:bg-gray-50'
            } ${(isMobile || !isCollapsed) ? '' : 'justify-center'}`}
            title={(isMobile || !isCollapsed) ? undefined : "What's this?"}
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
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {(isMobile || !isCollapsed) && <span>What's this?</span>}
          </Link>
          <Link
            href="/browse"
            onClick={() => isMobile && setIsMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal ${
              activePage === 'browse'
                ? 'bg-gray-100 text-black'
                : 'text-black hover:bg-gray-50'
            } ${(isMobile || !isCollapsed) ? '' : 'justify-center'}`}
            title={(isMobile || !isCollapsed) ? undefined : 'Browse'}
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
            {(isMobile || !isCollapsed) && <span>Browse</span>}
          </Link>
          <Link
            href="/my-evals"
            onClick={() => isMobile && setIsMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal ${
              activePage === 'my-evals'
                ? 'bg-gray-100 text-black'
                : 'text-black hover:bg-gray-50'
            } ${(isMobile || !isCollapsed) ? '' : 'justify-center'}`}
            title={(isMobile || !isCollapsed) ? undefined : 'My Evals'}
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
            {(isMobile || !isCollapsed) && <span>My Evals</span>}
          </Link>
        </nav>
      </div>
      
      {/* High School Section - Only show if user is an admin */}
      {userSchool && (
        <div className="mb-6 mt-8 border-t border-gray-100 pt-6">
          {(isMobile || !isCollapsed) && (
            <h2 className="text-sm font-semibold text-black mb-4">High School</h2>
          )}
          <nav className="space-y-2">
            <Link
              href={`/high-school/${userSchool.username}`}
              onClick={() => isMobile && setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal ${
                pathname === `/high-school/${userSchool.username}` || activePage === 'high-school'
                  ? 'bg-gray-100 text-black'
                  : 'text-black hover:bg-gray-50'
              } ${(isMobile || !isCollapsed) ? '' : 'justify-center'}`}
              title={(isMobile || !isCollapsed) ? undefined : 'School Page'}
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              {(isMobile || !isCollapsed) && <span>School Page</span>}
            </Link>
            <Link
              href={`/high-school/${userSchool.username}/roster`}
              onClick={() => isMobile && setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal ${
                pathname === `/high-school/${userSchool.username}/roster` || activePage === 'high-school-roster'
                  ? 'bg-gray-100 text-black'
                  : 'text-black hover:bg-gray-50'
              } ${(isMobile || !isCollapsed) ? '' : 'justify-center'}`}
              title={(isMobile || !isCollapsed) ? undefined : 'Roster'}
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {(isMobile || !isCollapsed) && <span>Roster</span>}
            </Link>
            <Link
              href={`/high-school/${userSchool.username}/evaluations`}
              onClick={() => isMobile && setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal ${
                pathname === `/high-school/${userSchool.username}/evaluations` || activePage === 'high-school-evaluations'
                  ? 'bg-gray-100 text-black'
                  : 'text-black hover:bg-gray-50'
              } ${(isMobile || !isCollapsed) ? '' : 'justify-center'}`}
              title={(isMobile || !isCollapsed) ? undefined : 'Evaluations'}
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {(isMobile || !isCollapsed) && <span>Evaluations</span>}
            </Link>
            <Link
              href={`/high-school/${userSchool.username}/billing`}
              onClick={() => isMobile && setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal ${
                pathname === `/high-school/${userSchool.username}/billing` || activePage === 'high-school-billing'
                  ? 'bg-gray-100 text-black'
                  : 'text-black hover:bg-gray-50'
              } ${(isMobile || !isCollapsed) ? '' : 'justify-center'}`}
              title={(isMobile || !isCollapsed) ? undefined : 'Billing'}
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" ry="2" strokeWidth={2} />
                <path strokeLinecap="round" strokeWidth={2} d="M3 10h18" />
                <path strokeLinecap="round" strokeWidth={2} d="M7 15h2m2 0h4" />
              </svg>
              {(isMobile || !isCollapsed) && <span>Billing</span>}
            </Link>
            <Link
              href={`/high-school/${userSchool.username}/referral`}
              onClick={() => isMobile && setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal ${
                pathname === `/high-school/${userSchool.username}/referral` || activePage === 'high-school-referral'
                  ? 'bg-gray-100 text-black'
                  : 'text-black hover:bg-gray-50'
              } ${(isMobile || !isCollapsed) ? '' : 'justify-center'}`}
              title={(isMobile || !isCollapsed) ? undefined : 'Referral'}
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="5" r="2.5" strokeWidth={2} />
                <circle cx="6" cy="17" r="2.5" strokeWidth={2} />
                <circle cx="18" cy="17" r="2.5" strokeWidth={2} />
                <path
                  strokeLinecap="round"
                  strokeWidth={2}
                  d="M11 7.3l-3.2 7.4M13 7.3l3.2 7.4"
                />
              </svg>
              {(isMobile || !isCollapsed) && <span>Referral</span>}
            </Link>
          </nav>
        </div>
      )}
    </aside>
    
    {/* Mobile hamburger button */}
    {isMobile && !isMobileOpen && (
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 md:hidden"
        aria-label="Open menu"
      >
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
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    )}
    </>
  )
}

