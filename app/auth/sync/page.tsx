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
        
        // Priority: query param (from callback) > localStorage (from button clicks)
        // Query param is more reliable as it comes directly from the auth callback
        const queryRedirect = searchParams.get('redirect')
        const postSignUpRedirect = typeof window !== 'undefined' 
          ? localStorage.getItem('postSignUpRedirect') 
          : null
        
        // Use query param first (from callback), then localStorage, then default to /browse
        const redirect = queryRedirect || postSignUpRedirect || '/browse'
        
        // Clear the localStorage redirect after using it (if it was used)
        if (postSignUpRedirect && typeof window !== 'undefined' && redirect === postSignUpRedirect) {
          localStorage.removeItem('postSignUpRedirect')
        }
      
      const supabase = createClient()
      
      // Verify session exists client-side - retry with delays since cookies might not be set yet
      let session = null
      let user = null
      let attempts = 0
      const maxAttempts = 5
      
      while (attempts < maxAttempts && !session) {
        // Try getUser() first as it's more reliable
        const userResult = await supabase.auth.getUser()
        user = userResult.data.user
        
        if (user) {
          // If we have a user, get the session
          const sessionResult = await supabase.auth.getSession()
          session = sessionResult.data.session
          
          if (session) {
            console.log('✅ Auth sync: Session found via getUser on attempt', attempts + 1)
            break
          }
        } else {
          // Fall back to getSession if getUser fails
          const sessionResult = await supabase.auth.getSession()
          session = sessionResult.data.session
          
          if (session) {
            console.log('✅ Auth sync: Session found via getSession on attempt', attempts + 1)
            break
          }
        }
        
        if (attempts < maxAttempts - 1) {
          console.log(`⏳ Auth sync: No session yet, retrying (${attempts + 1}/${maxAttempts})...`)
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        attempts++
      }
      
      if (!session) {
        console.error('❌ No session found on sync page after retries')
        console.error('❌ This might indicate the OAuth callback failed or cookies are not being set')
        // Don't redirect to signin - instead redirect to welcome to avoid redirect loops
        window.location.href = '/welcome'
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

      // Wait for remaining time to reach 2 seconds minimum (increased for cookie propagation)
      const elapsed = Date.now() - startTime
      const remainingWait = Math.max(0, 2000 - elapsed)
      await new Promise(resolve => setTimeout(resolve, remainingWait))

      // Re-check session one more time before redirecting to ensure it's still valid
      const { data: { session: finalSessionCheck } } = await supabase.auth.getSession()
      let validSession = finalSessionCheck
      
      if (!validSession) {
        console.error('❌ Session lost before redirect! Retrying once more...')
        // Wait and retry once more
        await new Promise(resolve => setTimeout(resolve, 500))
        const { data: { session: retrySessionCheck } } = await supabase.auth.getSession()
        if (!retrySessionCheck) {
          console.error('❌ Session still not found after retry')
          window.location.href = '/welcome'
          return
        }
        validSession = retrySessionCheck
      }

      // Determine final redirect - use the redirect we determined above
      // Always default to /browse if somehow redirect is still null/empty
      let finalRedirect = redirect || '/browse'
      
      // CRITICAL: Ensure we never redirect authenticated users to /welcome or root
      // Root will redirect to /welcome for unauthenticated users, so avoid it
      if (finalRedirect === '/welcome' || finalRedirect === '/') {
        console.warn('⚠️ Preventing redirect to /welcome or / for authenticated user, defaulting to /browse')
        console.warn('⚠️ Original redirect was:', finalRedirect)
        finalRedirect = '/browse'
      }
      
      // Double-check redirect is a valid path
      if (!finalRedirect || finalRedirect.trim() === '' || !finalRedirect.startsWith('/')) {
        console.error('❌ Invalid redirect detected:', finalRedirect, 'defaulting to /browse')
        finalRedirect = '/browse'
      }
      
      console.log('✅ Final redirect decision:', {
        queryRedirect,
        postSignUpRedirect,
        intermediateRedirect: redirect,
        finalRedirect,
        sessionUserId: validSession?.user?.id || 'unknown'
      })

      console.log('✅ Auth sync: Cookies processed, redirecting to:', finalRedirect)
      console.log('✅ Session confirmed, user ID:', validSession?.user?.id || 'unknown')
      
      // Use absolute URL to ensure proper redirect
      const absoluteUrl = new URL(finalRedirect, window.location.origin).href
      console.log('✅ Redirecting to absolute URL:', absoluteUrl)
      
      // Force a hard reload to ensure server reads cookies
      // Use replace instead of assign to avoid adding to history
      window.location.replace(absoluteUrl)
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

