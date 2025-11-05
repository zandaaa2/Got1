'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface SidebarProps {
  activePage?: 'browse' | 'my-evals'
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
    <aside
      className={`fixed left-0 top-0 bottom-0 bg-white border-r border-gray-200 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      } p-6`}
    >
      <div className="mb-8 flex items-center justify-between">
        {!isCollapsed && (
          <Link href="/" className="text-2xl font-bold text-black hover:opacity-70 transition-opacity">
            Got1
          </Link>
        )}
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
      
      <div className="mb-6">
        {!isCollapsed && (
          <h2 className="text-sm font-semibold text-black mb-4">Discover</h2>
        )}
        <nav className="space-y-2">
          <Link
            href="/browse"
            className={`flex items-center gap-3 px-3 py-2 rounded ${
              activePage === 'browse'
                ? 'bg-gray-100 text-black'
                : 'text-black hover:bg-gray-50'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Browse' : undefined}
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
          <Link
            href="/my-evals"
            className={`flex items-center gap-3 px-3 py-2 rounded ${
              activePage === 'my-evals'
                ? 'bg-gray-100 text-black'
                : 'text-black hover:bg-gray-50'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'My Evals' : undefined}
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
        </nav>
      </div>
    </aside>
  )
}

