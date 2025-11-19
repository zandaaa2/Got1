'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      
      // Check for error parameter (from auth callbacks)
      const error = searchParams.get('error')
      if (error) {
        // Handle auth errors by redirecting to sign-in
        console.error('Auth error:', error)
        router.replace('/auth/signin?error=' + encodeURIComponent(error))
        return
      }

      // Wait a moment for cookies to be available (especially after auth callbacks)
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check session client-side (cookies are always available here)
      const { data: { session } } = await supabase.auth.getSession()

      // If user is signed in, redirect to browse page
      // Otherwise, redirect to "What's this" page as the default landing page
      if (session) {
        router.replace('/browse')
      } else {
        router.replace('/whats-this')
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

