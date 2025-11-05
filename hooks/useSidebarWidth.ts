'use client'

import { useState, useEffect } from 'react'

/**
 * Custom hook to get the current sidebar width based on collapsed state.
 * Returns the width in pixels (64px when collapsed, 256px when expanded).
 * 
 * @returns {number} The sidebar width in pixels
 */
export function useSidebarWidth(): number {
  const [sidebarWidth, setSidebarWidth] = useState(256) // Default to expanded (w-64 = 256px)

  useEffect(() => {
    const checkSidebarState = () => {
      if (typeof window !== 'undefined') {
        const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true'
        setSidebarWidth(isCollapsed ? 64 : 256) // w-16 = 64px, w-64 = 256px
      }
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

  return sidebarWidth
}

