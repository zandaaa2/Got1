'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

/**
 * Client component that syncs auth session after redirect.
 * Checks if session exists client-side but not server-side, and refreshes if needed.
 */
export default function AuthSessionSync() {
  const router = useRouter()
  const pathname = usePathname()
  const hasChecked = useRef(false)

  useEffect(() => {
    // Only check once on mount
    if (hasChecked.current) return
    
    const checkSession = async () => {
      const supabase = createClient()
      
      // Check if we have a session client-side
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        console.log('🔍 AuthSessionSync: Session found client-side, user:', session.user.id)
        
        // Check if we're on a page with ?v= timestamp (indicates recent auth redirect)
        const urlParams = new URLSearchParams(window.location.search)
        const hasVersionParam = urlParams.has('v')
        
        // Wait a moment to let server-side rendering complete
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Check if server rendered without session by looking for auth buttons
        const authButtons = document.querySelector('[data-auth-buttons]')
        const userAvatar = document.querySelector('[data-user-avatar]')
        
        // If we have a session client-side but see auth buttons server-side,
        // the server didn't see the cookies yet - force a refresh
        if (authButtons && !userAvatar) {
          console.log('🔄 AuthSessionSync: Server didn\'t see session, refreshing...')
          // Remove version param to avoid loops
          const newUrl = pathname + (pathname.includes('?') ? '&' : '?') + 'refresh=' + Date.now()
          window.location.href = newUrl
          hasChecked.current = true
          return
        }
        
        // If we just came from auth callback (has version param), do a router refresh
        if (hasVersionParam) {
          console.log('🔄 AuthSessionSync: Refreshing router after auth callback...')
          // Remove version param
          const cleanUrl = pathname + window.location.search.replace(/[?&]v=\d+/, '').replace(/[?&]$/, '')
          window.history.replaceState({}, '', cleanUrl || pathname)
          router.refresh()
          hasChecked.current = true
          return
        }
      }
      
      hasChecked.current = true
    }
    
    checkSession()
  }, [router, pathname])

  return null
}

