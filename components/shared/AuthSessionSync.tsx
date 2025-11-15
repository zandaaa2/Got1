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
  const hasAttemptedNotification = useRef(false)

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
        const isNewAuth = hasVersionParam || urlParams.has('refresh')
        
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
        
        // Create sign-in/sign-up notification - FALLBACK ONLY
        // The createNotification function will handle duplicate prevention at the database level
        // This ensures a notification is created even if /auth/sync didn't run (e.g., OAuth error)
        if (!hasAttemptedNotification.current) {
          try {
            // Check if we should create one as fallback
            // Create if: 1) Has refresh/v params (new auth), OR 2) URL has error=auth_failed (OAuth callback failed but session exists)
            const urlParams = new URLSearchParams(window.location.search)
            const hasAuthError = urlParams.get('error') === 'auth_failed'
            const shouldCreate = isNewAuth || hasAuthError
            
            if (shouldCreate) {
              hasAttemptedNotification.current = true // Mark as attempted immediately
              
              // Determine if this is a new signup by checking when the auth user was created
              let isNewSignup = false
              let timeSinceCreation: number | null = null
              
              if (session.user.created_at) {
                const userCreatedAt = new Date(session.user.created_at)
                if (!isNaN(userCreatedAt.getTime())) {
                  const now = Date.now()
                  timeSinceCreation = now - userCreatedAt.getTime()
                  // Use 10 minutes window to match /auth/sync logic
                  isNewSignup = timeSinceCreation < 10 * 60 * 1000 // 10 minutes
                }
              }
              
              const notificationType = isNewSignup ? 'user_signed_up' : 'user_signed_in'
              
              console.log('🔔 AuthSessionSync: Creating notification (fallback)...', {
                notificationType,
                isNewSignup,
                isNewAuth,
                hasAuthError,
                userCreatedAt: session.user.created_at,
                timeSinceCreationSeconds: timeSinceCreation ? Math.round(timeSinceCreation / 1000) + 's' : 'N/A',
              })
              
              const response = await fetch('/api/notifications/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: notificationType,
                  title: isNewSignup ? 'Welcome to Got1!' : 'Welcome Back!',
                  message: isNewSignup 
                    ? 'Thanks for signing up! Complete your profile to get started.'
                    : 'You have successfully signed in.',
                  link: isNewSignup ? '/profile/user-setup' : '/',
                  metadata: {
                    signup_method: session.user.app_metadata?.provider || 'email',
                    fallback: true, // Always mark as fallback since this is the fallback handler
                    source: 'auth_session_sync',
                    user_created_at: session.user.created_at,
                  },
                }),
              })
              
              if (response.ok) {
                console.log(`✅ ${notificationType} notification created (fallback)`)
                // Clean up error param from URL
                if (hasAuthError) {
                  const cleanUrl = window.location.pathname
                  window.history.replaceState({}, '', cleanUrl)
                }
              } else {
                const error = await response.json().catch(() => ({}))
                console.error(`Failed to create ${notificationType} notification:`, error)
                hasAttemptedNotification.current = false // Reset on error
              }
            } else {
              console.log('⏭️ Skipping notification - not a fresh auth event')
            }
          } catch (error) {
            console.error('Error creating auth notification:', error)
            hasAttemptedNotification.current = false // Reset on error
            // Don't block auth flow if notification fails
          }
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

