'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type_param = searchParams.get('type')

  useEffect(() => {
    /**
     * Handles authentication callbacks for both OAuth and email confirmation.
     * For OAuth: exchanges code for session using PKCE.
     * For email confirmation: verifies token_hash and creates session.
     * Verifies the session is created, validates the user JWT with retry logic,
     * and checks if user profile exists before redirecting.
     *
     * @returns {Promise<void>}
     */
    const handleCallback = async () => {
      // Handle email confirmation (token_hash)
      if (token_hash && type_param) {
        const supabase = createClient()
        try {
          console.log('Handling email confirmation callback...')
          
          const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
            token_hash,
            type: type_param as 'email' | 'signup' | 'invite' | 'recovery' | 'magiclink',
          })

          if (sessionError) {
            console.error('Error verifying email token:', sessionError)
            router.push('/?error=auth_failed')
            return
          }

          const session = sessionData.session
          if (!session) {
            console.error('No session in verification response')
            router.push('/?error=no_session')
            return
          }

          console.log('✅ Email confirmation session created, user ID:', session.user.id)

          // Wait for cookies to be set
          await new Promise(resolve => setTimeout(resolve, 300))

          // Verify session is accessible
          const { data: { session: verifySession } } = await supabase.auth.getSession()
          if (!verifySession) {
            console.error('❌ Session not found after email verification')
            router.push('/?error=session_not_persisted')
            return
          }

          // Verify user can be retrieved
          const { data: { user: verifyUser }, error: userError } = await supabase.auth.getUser()
          if (userError || !verifyUser) {
            console.error('❌ getUser failed after email verification:', userError?.message)
            router.push('/?error=user_validation_failed')
            return
          }

          console.log('✅ User validated successfully:', verifyUser.id)

          // Check if profile exists
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle()

          // Verify session exists client-side
          const { data: { session: verifySession } } = await supabase.auth.getSession()
          if (!verifySession) {
            console.error('❌ Session not found after email verification')
            router.push('/?error=session_not_persisted')
            return
          }

          // Determine redirect URL
          const finalRedirect = !profile 
            ? '/profile/user-setup'
            : '/'

          console.log('✅ Email verification session verified, redirecting through sync page to:', finalRedirect)
          
          // Redirect through sync page which will ensure cookies are set server-side
          const syncUrl = `/auth/sync?redirect=${encodeURIComponent(finalRedirect)}`
          window.location.href = syncUrl

          return
        } catch (error: any) {
          console.error('Email confirmation callback error:', error)
          router.push('/?error=auth_failed')
          return
        }
      }

      // Handle OAuth callback (code)
      if (!code) {
        const errorParam = searchParams.get('error')
        if (errorParam) {
          console.error('OAuth error:', errorParam)
          router.push(`/?error=${errorParam}`)
        } else {
          router.push('/?error=no_code')
        }
        return
      }

      // Wait a moment to ensure localStorage and cookies are accessible
      await new Promise(resolve => setTimeout(resolve, 200))

      // Check for code_verifier in localStorage (required for PKCE)
      const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]
      let verifierKey = ''
      let verifier = null
      
      console.log('🔍 Looking for code verifier...')
      console.log('Project ref:', projectRef)
      
      if (projectRef) {
        // Try the standard key format that createBrowserClient uses
        verifierKey = `sb-${projectRef}-auth-token-code-verifier`
        verifier = localStorage.getItem(verifierKey)
        console.log('Checked standard key:', verifierKey, 'Found:', !!verifier)
        
        // If not found, check all localStorage keys for any verifier
        if (!verifier) {
          const allKeys = Object.keys(localStorage)
          console.log('All localStorage keys:', allKeys)
          const verifierKeys = allKeys.filter(k => 
            k.includes('code-verifier') || 
            k.includes('code_verifier') ||
            k.includes('verifier')
          )
          console.log('Verifier-related keys found:', verifierKeys)
          
          // Try to find verifier in any matching key
          for (const key of verifierKeys) {
            const value = localStorage.getItem(key)
            if (value) {
              verifier = value
              verifierKey = key
              console.log('✅ Found verifier in key:', key)
              // Also store it in the standard key format for Supabase client
              if (key !== `sb-${projectRef}-auth-token-code-verifier`) {
                localStorage.setItem(`sb-${projectRef}-auth-token-code-verifier`, value)
                console.log('✅ Copied to standard key format')
              }
              break
            }
          }
        }
      }

      // Also check if verifier is in cookies (might be needed as fallback)
      const cookies = document.cookie.split(';').map(c => c.trim())
      console.log('All cookies:', cookies.map(c => c.split('=')[0]))
      const verifierCookie = cookies.find(c => c.includes('code-verifier'))
      
      if (verifierCookie && !verifier) {
        console.log('Found verifier in cookie, extracting...')
        try {
          const equalIndex = verifierCookie.indexOf('=')
          if (equalIndex !== -1) {
            let cookieValue = verifierCookie.substring(equalIndex + 1)
            // Decode URL encoding and remove quotes
            cookieValue = decodeURIComponent(cookieValue)
            cookieValue = cookieValue.replace(/^"|"$/g, '').replace(/^%22|%22$/g, '')
            
            if (cookieValue && projectRef) {
              // Store in localStorage with correct key for Supabase client
              localStorage.setItem(`sb-${projectRef}-auth-token-code-verifier`, cookieValue)
              verifier = cookieValue
              verifierKey = `sb-${projectRef}-auth-token-code-verifier`
              console.log('✅ Copied verifier from cookie to localStorage')
            }
          }
        } catch (e) {
          console.error('Error extracting verifier from cookie:', e)
        }
      }

      if (!verifier) {
        console.error('❌ Code verifier not found in localStorage or cookies')
        console.error('This will cause exchangeCodeForSession to fail')
        console.error('Please ensure OAuth flow initiated from same origin')
        router.push('/?error=verifier_not_found')
        return
      }

      console.log('✅ Code verifier found in key:', verifierKey)
      console.log('✅ Code parameter:', code ? code.substring(0, 20) + '...' : 'MISSING')

      // Verify the code is actually present
      if (!code || code.trim().length === 0) {
        console.error('❌ Code parameter is empty or missing')
        router.push('/?error=code_missing')
        return
      }

      // Ensure code is a valid string (not null/undefined)
      const codeValue = String(code).trim()
      if (!codeValue || codeValue.length === 0) {
        console.error('❌ Code is empty after conversion to string')
        router.push('/?error=code_invalid')
        return
      }

      // Double-check verifier is still there
      const verifierCheck = localStorage.getItem(verifierKey)
      if (!verifierCheck) {
        console.error('❌ Verifier disappeared from localStorage!')
        router.push('/?error=verifier_lost')
        return
      }

      console.log('🔍 Verifying client setup...')
      console.log('Code value:', codeValue.substring(0, 30) + '...')
      console.log('Code length:', codeValue.length)
      console.log('Verifier key:', verifierKey)
      console.log('Verifier length:', verifierCheck.length)
      console.log('Verifier first 20 chars:', verifierCheck.substring(0, 20))

      // Create client FRESH right before exchange to ensure it reads current localStorage
      // createBrowserClient reads localStorage dynamically, but we want to be sure
      const supabase = createClient() // Declare supabase for OAuth flow
      
      // Wait a moment to ensure client is fully initialized
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Final verification - ensure verifier is still accessible
      const finalVerifierCheck = localStorage.getItem(verifierKey)
      if (!finalVerifierCheck) {
        console.error('❌ Verifier not accessible right before exchange!')
        router.push('/?error=verifier_not_accessible')
        return
      }
      
      console.log('🔄 Attempting exchangeCodeForSession...')
      console.log('Final verifier check - length:', finalVerifierCheck.length)
      
      // Verify the exact localStorage key one more time
      const localStorageKeys = Object.keys(localStorage)
      const matchingKeys = localStorageKeys.filter(k => k.includes('code-verifier'))
      console.log('All localStorage keys with "code-verifier":', matchingKeys)
      matchingKeys.forEach(key => {
        const value = localStorage.getItem(key)
        console.log(`Key "${key}": length=${value?.length || 0}`)
      })
      
      try {
        // Exchange code for session - Supabase client handles PKCE automatically
        // createBrowserClient reads verifier from localStorage: sb-{project-ref}-auth-token-code-verifier
        // The verifier MUST be in localStorage with the exact key format above
        // 
        // CRITICAL: The verifier must be accessible when exchangeCodeForSession is called.
        // If createBrowserClient isn't reading it, it might be a version issue or the client
        // needs to be created in the same context where OAuth was initiated.
        //
        // As a workaround, we ensure the verifier is in localStorage with the exact key
        // that createBrowserClient expects, and create a fresh client instance.
        const { data, error } = await supabase.auth.exchangeCodeForSession(codeValue)

        if (error) {
          console.error('Exchange error:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          router.push('/?error=auth_failed')
          return
        }

        if (!data.session) {
          console.error('No session in response')
          router.push('/?error=no_session')
          return
        }

        console.log('✅ Session created, user ID:', data.session.user.id)

        // Wait for cookies to be set by the browser client
        // createBrowserClient from @supabase/ssr sets cookies automatically
        await new Promise(resolve => setTimeout(resolve, 500))

        // Verify session is actually in the client
        const { data: { session: verifySession } } = await supabase.auth.getSession()
        if (!verifySession) {
          console.error('❌ Session not found after exchange')
          router.push('/?error=session_not_persisted')
          return
        }

        // Verify user can be retrieved (this validates the JWT)
        const { data: { user: verifyUser }, error: userError } = await supabase.auth.getUser()
        if (userError || !verifyUser) {
          console.error('❌ getUser failed after session exchange:', userError?.message)
          router.push('/?error=user_validation_failed')
          return
        }
        console.log('✅ User validated successfully:', verifyUser.id)

        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', data.session.user.id)
          .maybeSingle()

        // Verify session exists before redirect
        const { data: { session: verifySession } } = await supabase.auth.getSession()
        if (!verifySession) {
          console.error('❌ Session not found after exchange')
          router.push('/?error=session_not_persisted')
          return
        }

        // Determine redirect URL
        const finalRedirect = !profile 
          ? '/profile/user-setup'
          : '/'

        console.log('✅ Session verified, redirecting through sync page to:', finalRedirect)
        
        // Redirect through sync page which will ensure cookies are set server-side
        // before doing the final redirect
        const syncUrl = `/auth/sync?redirect=${encodeURIComponent(finalRedirect)}`
        window.location.href = syncUrl
      } catch (error: any) {
        console.error('Callback error:', error)
        router.push('/?error=auth_failed')
      }
    }

    if (code || (token_hash && type_param)) {
      handleCallback()
    }
  }, [code, token_hash, type_param, router, searchParams])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg">Completing sign in...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}

