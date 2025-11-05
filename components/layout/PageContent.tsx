'use client'

import { useState, useEffect } from 'react'

interface PageContentProps {
  children: React.ReactNode
  header: React.ReactNode
}

export default function PageContent({ children, header }: PageContentProps) {
  const [sidebarWidth, setSidebarWidth] = useState(256) // 64 * 4 = 256px (w-64)

  useEffect(() => {
    const checkSidebarState = () => {
      const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true'
      setSidebarWidth(isCollapsed ? 64 : 256) // 16 * 4 = 64px (w-16) or 64 * 4 = 256px (w-64)
    }

    checkSidebarState()
    
    // Listen for custom sidebar toggle event
    const handleSidebarToggle = (e: CustomEvent) => {
      const isCollapsed = e.detail.isCollapsed
      setSidebarWidth(isCollapsed ? 64 : 256)
    }
    
    // Listen for storage changes (for cross-tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebar-collapsed') {
        checkSidebarState()
      }
    }
    
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener)
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div 
      className="flex-1 transition-all duration-300" 
      style={{ marginLeft: isMobile ? '0px' : `${sidebarWidth}px` }}
    >
      <header
        className={`fixed top-0 right-0 bg-white flex justify-end items-center gap-2 md:gap-4 z-10 transition-all duration-300 ${
          isMobile ? 'left-0 px-4 py-3' : 'px-8 py-4'
        }`}
        style={isMobile ? {} : { left: `${sidebarWidth}px` }}
      >
        {header}
      </header>
      <main className={`pt-16 md:pt-20 pb-8 ${isMobile ? 'px-4' : 'px-8'}`}>
        {children}
      </main>
    </div>
  )
}

