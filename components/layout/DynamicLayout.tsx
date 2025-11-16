'use client'

import { useState, useEffect } from 'react'
import { useSidebarWidth } from '@/hooks/useSidebarWidth'
import FeatureRequest from '@/components/shared/FeatureRequest'
import HelpMeetingButton from '@/components/shared/HelpMeetingButton'
import NotificationIconWrapper from '@/components/shared/NotificationIconWrapper'
import { createClient } from '@/lib/supabase-client'

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
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUserId(session?.user?.id || null)
    }
    getUserId()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getUserId()
    })

    return () => {
      subscription.unsubscribe()
    }
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
          {/* Help button sits to the left of Feature Request on desktop */}
          <HelpMeetingButton />
          <FeatureRequest />
          <NotificationIconWrapper userId={userId} />
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

