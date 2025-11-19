'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

/**
 * Intermediate page that waits for cookies to be fully set before redirecting.
 * Shows a loading overlay for 1 second to ensure cookies are processed, then does a hard refresh.
 */
function AuthSyncContent() {
  const searchParams = useSearchParams()
  
  console.log('🔵 AuthSyncContent component rendered')

  useEffect(() => {
    console.log('🔵 AuthSyncContent useEffect triggered')
    console.log('🔵 Redirect param:', searchParams.get('redirect'))
    
    const syncAuth = async () => {
      console.log('🔵 syncAuth function called')
      // Check localStorage for post-signup redirect (e.g., from "Become a Scout" button)
      const postSignUpRedirect = typeof window !== 'undefined' 
        ? localStorage.getItem('postSignUpRedirect') 
        : null
      
      // Use redirect from localStorage if available, otherwise use query param, otherwise default to '/'
      const redirect = postSignUpRedirect || searchParams.get('redirect') || '/'
      
      // Clear the localStorage redirect after using it
      if (postSignUpRedirect && typeof window !== 'undefined') {
        localStorage.removeItem('postSignUpRedirect')
      }
      
      const supabase = createClient()
      
      // Verify session exists client-side
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.error('No session found on sync page')
        window.location.href = '/auth/signin'
        return
      }

      console.log('✅ Auth sync: Session found, waiting for cookies to process...')
      
      // Determine if this is a new signup by checking when the auth user was created
      // This is more reliable than checking profile creation time
      let isNewSignup = false
      
      if (session.user.created_at) {
        const userCreatedAt = new Date(session.user.created_at)
        const now = Date.now()
        
        // Validate the date
        if (isNaN(userCreatedAt.getTime())) {
          console.warn('⚠️ Invalid created_at date:', session.user.created_at)
          // Fallback: if we can't parse the date, assume it's not a new signup
          isNewSignup = false
        } else {
          const timeSinceCreation = now - userCreatedAt.getTime()
          
          // If user was created within the last 10 minutes, treat it as a new signup
          // Extended to 10 minutes to handle any delays in redirects, profile creation, etc.
          isNewSignup = timeSinceCreation < 10 * 60 * 1000 // 10 minutes
          
          console.log('🔍 Signup check:', {
            userCreatedAt: session.user.created_at,
            parsedDate: userCreatedAt.toISOString(),
            timeSinceCreationMs: timeSinceCreation,
            timeSinceCreationSeconds: Math.round(timeSinceCreation / 1000),
            isNewSignup,
          })
        }
      } else {
        console.warn('⚠️ No created_at found on user object')
        // If no created_at, assume it's not a new signup (shouldn't happen)
        isNewSignup = false
      }
      
      // Wait a moment for cookies to be set before making API calls
      // This ensures the server-side API route can read the session
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Ensure minimum 1 second wait for cookies to be fully processed by browser
      const startTime = Date.now()
      
      // Create notification (signup or signin)
      // The createNotification function will handle duplicate prevention at the database level
      let notificationCreated = false
      try {
        const notificationType = isNewSignup ? 'user_signed_up' : 'user_signed_in'
        
        console.log(`📧 Creating ${notificationType} notification for user ${session.user.id}...`)
        console.log(`📊 Final decision - Is new signup: ${isNewSignup}, Notification type: ${notificationType}`)
        console.log(`📊 Session user data:`, {
          id: session.user.id,
          email: session.user.email,
          created_at: session.user.created_at,
        })
        
        const response = await fetch('/api/notifications/create', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Ensure cookies are sent
          body: JSON.stringify({
            type: notificationType,
            title: isNewSignup ? 'Welcome to Got1!' : 'Welcome Back!',
            message: isNewSignup 
              ? 'Thanks for signing up! Complete your profile to get started.'
              : 'You have successfully signed in.',
            link: isNewSignup ? '/profile/user-setup' : '/',
            metadata: {
              signup_method: session.user.app_metadata?.provider || 'email',
              source: 'auth_sync',
              user_created_at: session.user.created_at,
            },
          }),
        })
        
        const responseData = await response.json().catch(() => ({ error: 'Failed to parse response' }))
        
        if (!response.ok) {
          console.error(`❌ FAILED to create ${notificationType} notification:`, {
            status: response.status,
            statusText: response.statusText,
            error: responseData,
            userId: session.user.id,
            notificationType,
          })
        } else {
          notificationCreated = true
          console.log(`✅ ${notificationType} notification created successfully!`, {
            response: responseData,
            userId: session.user.id,
            notificationType,
          })
        }
      } catch (error: any) {
        console.error('❌ ERROR creating auth notification:', {
          error: error.message,
          stack: error.stack,
          userId: session.user.id,
        })
        // Don't block auth flow if notification fails, but log extensively
      }
      
      if (!notificationCreated) {
        console.warn('⚠️ WARNING: Notification was not created. User may not receive a notification.')
      }
      
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

export default function AuthSyncPage() {
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
      <AuthSyncContent />
    </Suspense>
  )
}

