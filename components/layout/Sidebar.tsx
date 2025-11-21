'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import Modal from '@/components/shared/Modal'
import { openCalendly30Min } from '@/lib/calendly'

interface SidebarProps {
  activePage?: 'whats-this' | 'browse' | 'my-evals' | 'profile' | 'notifications' | 'make-money'
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
  const [showTalkToUsModal, setShowTalkToUsModal] = useState(false)
  
  // Determine active page from pathname if not provided as prop
  const currentActivePage = activePage || (
    pathname === '/whats-this' ? 'whats-this' :
    pathname === '/browse' ? 'browse' :
    pathname === '/my-evals' ? 'my-evals' :
    pathname === '/profile' ? 'profile' :
    pathname === '/notifications' ? 'notifications' :
    pathname === '/make-money' ? 'make-money' :
    undefined
  )
  
  // Check if mobile viewport
  const [isMobile, setIsMobile] = useState(false)
  
  // Get user ID and role
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user?.id) {
          setUserId(session.user.id)
          
          // Get user's role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle()
          
          if (profile) {
            setUserRole(profile.role)
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      }
    }
    
    loadUserData()
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
        className={`fixed left-0 top-0 bottom-0 bg-white border-r border-gray-200 transition-all duration-300 z-50 flex flex-col ${
          isMobile
            ? isMobileOpen
              ? 'w-64 translate-x-0'
              : '-translate-x-full'
            : isCollapsed
            ? 'w-24'
            : 'w-64'
        }`}
      >
      <div className={`p-4 md:p-6 flex-shrink-0 ${isMobile || !isCollapsed ? 'flex items-center justify-between' : 'flex flex-col items-center gap-4'}`}>
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
      
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-0">
        <div className="mb-6">
          {(isMobile || !isCollapsed) && (
            <h2 className="text-sm font-semibold text-black mb-4">Discover</h2>
          )}
          <nav className="space-y-2">
          <Link
            href="/whats-this"
            onClick={() => isMobile && setIsMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal ${
              currentActivePage === 'whats-this'
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
              currentActivePage === 'browse'
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
              currentActivePage === 'my-evals'
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
      </div>

      {/* Make Money and Talk to Us Buttons - Bottom left */}
      <div className={`flex-shrink-0 p-4 md:p-6 pt-0 ${isMobile ? '' : isCollapsed ? 'px-2' : ''}`}>
        <nav className="space-y-2">
          {/* Only show Make Money link if user is not a player */}
          {userRole !== 'player' && (
            <Link
              href="/make-money"
              onClick={() => isMobile && setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal ${
                currentActivePage === 'make-money'
                  ? 'bg-gray-100 text-black'
                  : 'text-black hover:bg-gray-50'
              } ${(isMobile || !isCollapsed) ? '' : 'justify-center'}`}
              title={(isMobile || !isCollapsed) ? undefined : 'Make Money'}
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {(isMobile || !isCollapsed) && <span>Make Money</span>}
            </Link>
          )}
          <button
            onClick={() => setShowTalkToUsModal(true)}
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-normal text-black hover:bg-gray-50 ${
              (isMobile || !isCollapsed) ? '' : 'justify-center'
            }`}
            title={(isMobile || !isCollapsed) ? undefined : 'Talk to us'}
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {(isMobile || !isCollapsed) && <span>Talk to us</span>}
          </button>
        </nav>
      </div>
    </aside>

    {/* Talk to Us Modal */}
    {showTalkToUsModal && (
      <Modal isOpen={showTalkToUsModal} onClose={() => setShowTalkToUsModal(false)} title="Talk to us">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Choose how you'd like to get help:
          </p>
          
          <button
            onClick={() => {
              openCalendly30Min()
              setShowTalkToUsModal(false)
            }}
            className="w-full interactive-press flex items-center gap-3 p-4 rounded-lg border-2 border-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-black">Set up a call</h3>
              <p className="text-sm text-gray-600">Schedule a 30-minute call to discuss your needs</p>
            </div>
          </button>

          <button
            onClick={() => {
              // TODO: Open chatbot widget (Crisp, Intercom, etc.)
              // For now, this is a placeholder
              if (typeof window !== 'undefined' && (window as any).$crisp) {
                (window as any).$crisp.push(['do', 'chat:open'])
              } else {
                alert('Chatbot coming soon! For now, please use the "Set up a call" option.')
              }
              setShowTalkToUsModal(false)
            }}
            className="w-full interactive-press flex items-center gap-3 p-4 rounded-lg border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-black">Use chatbot</h3>
              <p className="text-sm text-gray-600">Get instant help with our AI assistant</p>
            </div>
          </button>
        </div>
      </Modal>
    )}
    
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

