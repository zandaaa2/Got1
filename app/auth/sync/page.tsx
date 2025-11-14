'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

/**
 * Intermediate page that waits for cookies to be fully set before redirecting.
 * Shows a loading overlay for 1 second to ensure cookies are processed, then does a hard refresh.
 */
export default function AuthSyncPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const syncAuth = async () => {
      const redirect = searchParams.get('redirect') || '/'
      const supabase = createClient()
      
      // Verify session exists client-side
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.error('No session found on sync page')
        window.location.href = '/auth/signin'
        return
      }

      console.log('✅ Auth sync: Session found, waiting for cookies to process...')
      
      // Ensure minimum 1 second wait for cookies to be fully processed by browser
      const startTime = Date.now()
      
      // Optionally call API route to set cookies server-side (doesn't block)
      fetch('/api/auth/set-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {
        // Ignore errors - cookies might already be set
      })

      // Wait for remaining time to reach 1 second minimum
      const elapsed = Date.now() - startTime
      const remainingWait = Math.max(0, 1000 - elapsed)
      await new Promise(resolve => setTimeout(resolve, remainingWait))

      console.log('✅ Auth sync: Cookies processed, redirecting...')
      
      // Force a hard reload to ensure server reads cookies
      window.location.href = redirect
    }

    syncAuth()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-12 h-12 mx-auto">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-lg font-medium text-gray-900">Completing sign in...</p>
      </div>
    </div>
  )
}

