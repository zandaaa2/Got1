'use client'

import { useState, useEffect } from 'react'
import { useSidebarWidth } from '@/hooks/useSidebarWidth'
import FeatureRequest from '@/components/shared/FeatureRequest'

interface DynamicLayoutProps {
  children: React.ReactNode
  header: React.ReactNode
}

/**
 * Client component that wraps page content and adjusts margins based on sidebar width.
 * This ensures the content area slides left when the sidebar is minimized.
 */
export default function DynamicLayout({ children, header }: DynamicLayoutProps) {
  const sidebarWidth = useSidebarWidth()
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
      className="flex-1 transition-all duration-300 overflow-x-hidden"
      style={{ marginLeft: isMobile ? '0px' : `${sidebarWidth}px` }}
    >
      <header
        className={`fixed top-0 right-0 z-20 bg-white/90 backdrop-blur-sm transition-all duration-300 ${
          isMobile ? 'left-0 px-4 py-3' : 'px-8 py-4'
        }`}
        style={isMobile ? {} : { left: `${sidebarWidth}px` }}
      >
        <div className="flex w-full items-center justify-end gap-3">
          <FeatureRequest />
          {header ? (
            <div className="flex items-center gap-2 md:gap-3">
              {header}
            </div>
          ) : null}
        </div>
      </header>
      <main className={`pt-16 md:pt-20 pb-8 overflow-x-hidden ${isMobile ? 'px-4' : 'px-6 md:px-8'}`}>
        <div className="mx-auto w-full max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  )
}

