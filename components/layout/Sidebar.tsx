'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface SidebarProps {
  activePage?: 'whats-this' | 'browse' | 'my-evals' | 'profile'
  onToggle?: (isCollapsed: boolean) => void
}

export default function Sidebar({ activePage, onToggle }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed')
      return saved === 'true'
    }
    return false
  })
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  
  // Check if mobile viewport
  const [isMobile, setIsMobile] = useState(false)
  
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

