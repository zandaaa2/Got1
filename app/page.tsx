'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkAuth = async () => {
        console.log('🟢 Root page (/), checking auth...')
        console.log('🟢 Full URL:', window.location.href)
        console.log('🟢 Search params:', Object.fromEntries(searchParams.entries()))
        
        // Check for OAuth callback parameters FIRST, before any other checks
        // If Supabase redirects OAuth to root instead of /auth/callback, catch it here
        const code = searchParams.get('code')
        const token_hash = searchParams.get('token_hash')
        const type_param = searchParams.get('type')
        
        console.log('🟢 OAuth params check:', { code: !!code, token_hash: !!token_hash, type_param })
        
        if (code || (token_hash && type_param)) {
          console.log('🟢 OAuth callback detected on root page, redirecting to /auth/callback')
          // Preserve all query parameters when redirecting
          const callbackUrl = new URL('/auth/callback', window.location.origin)
          searchParams.forEach((value, key) => {
            callbackUrl.searchParams.set(key, value)
          })
          console.log('🟢 Redirecting to:', callbackUrl.href)
          window.location.replace(callbackUrl.href)
          return
        }

        // Add timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          console.warn('🟢 Auth check timeout - redirecting to welcome')
          router.replace('/welcome')
        }, 3000) // 3 second timeout

      try {
        const supabase = createClient()
        
        // Check for error parameter (from auth callbacks)
        const error = searchParams.get('error')
        if (error) {
          clearTimeout(timeoutId)
          console.error('🟢 Auth error:', error)
          router.replace('/auth/signin?error=' + encodeURIComponent(error))
          return
        }

        // Wait a moment for cookies to be available (especially after auth callbacks)
        // Increase wait time after sign-in to ensure session is fully established
        await new Promise(resolve => setTimeout(resolve, 500))

        // Check session client-side (cookies are always available here)
        // Try multiple times if session is not immediately available (race condition after sign-in)
        let session = null
        let sessionError = null
        let attempts = 0
        const maxAttempts = 3
        
        while (attempts < maxAttempts && !session) {
          const result = await supabase.auth.getSession()
          session = result.data.session
          sessionError = result.error
          
          if (session) break
          
          // Wait a bit longer before retrying
          if (attempts < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 300))
          }
          attempts++
        }
        
        clearTimeout(timeoutId)
        
        if (sessionError && !session) {
          console.error('Error getting session after retries:', sessionError)
          // On error, redirect to welcome page
          router.replace('/welcome')
          return
        }

        // If user is signed in, redirect to home page
        // Otherwise, redirect to welcome page as the default landing page
        if (session) {
          router.replace('/home')
        } else {
          router.replace('/welcome')
        }
      } catch (error) {
        clearTimeout(timeoutId)
        console.error('Error in checkAuth:', error)
        // On any error, redirect to welcome page
        router.replace('/welcome')
      }
    }

    checkAuth()
  }, [router, searchParams])

  // Show loading state while checking auth
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-12 h-12 mx-auto">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-lg font-medium text-gray-900">Loading...</p>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-lg font-medium text-gray-900">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}

