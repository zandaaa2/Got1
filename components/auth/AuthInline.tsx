'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'

interface AuthInlineProps {
  mode: 'signin' | 'signup'
}

export default function AuthInline({ mode }: AuthInlineProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  /**
   * Handles email-based authentication (sign up or sign in).
   * For signup: Creates account with password and sends confirmation email.
   * For signin: Signs in with email and password.
   *
   * @param {React.FormEvent} e - The form submission event
   * @returns {Promise<void>}
   */
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)

      if (mode === 'signup') {
        // Sign up with email and password
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          },
        })
        if (error) throw error
        setSuccess(true)
        setLoading(false)
      } else {
        // Sign in with email and password
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        
        // Wait for session cookies to be set
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Verify session is accessible
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          // Wait a bit more and try again
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        setLoading(false)
        
        // Use window.location with cache bust to force fresh server render
        const timestamp = Date.now()
        window.location.href = `/?refresh=${timestamp}` // Full reload with cache bust
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred')
      setLoading(false)
    }
  }

  /**
   * Handles Google OAuth authentication.
   * Initiates the OAuth flow and redirects to Google for authentication.
   *
   * @returns {Promise<void>}
   */
  const handleGoogleAuth = async () => {
    try {
      setLoading(true)
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error: any) {
      setError(error.message || 'An error occurred')
      setLoading(false)
    }
  }

  const mainInstruction = mode === 'signin' ? 'Sign in with an account' : ''
  const smallerInstruction = mode === 'signup' 
    ? 'Enter your email to sign up for this app' 
    : 'Enter your email to sign in for this app'
  const buttonText = mode === 'signup' ? 'Sign up with email' : 'Sign in with email'

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
        <div className="space-y-6">
          {/* Title */}
          <h1 className="text-2xl font-bold text-black">Got1</h1>

          {/* Main Instruction - only show for signin */}
          {mainInstruction && (
            <h2 className="text-lg font-bold text-black">{mainInstruction}</h2>
          )}

          {/* Smaller Instruction - only show if not in success state */}
          {!(success && mode === 'signup') && (
            <p className="text-sm text-black">{smallerInstruction}</p>
          )}

          {success && mode === 'signup' ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              Check your email to confirm your account. Click the link in the email to complete sign up.
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@domain.com"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                  required
                  minLength={mode === 'signup' ? 6 : undefined}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
                {mode === 'signup' && (
                  <p className="text-xs text-gray-600">
                    Password must be at least 6 characters long.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processing...' : buttonText}
                </button>
              </form>

              {/* Separator */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or continue with</span>
                </div>
              </div>

              {/* Google Button */}
              <button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 rounded-lg bg-white text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Google</span>
              </button>
            </>
          )}

          {/* Terms and Privacy Policy */}
          <p className="text-xs text-black text-center">
            By clicking continue, you agree to our{' '}
            <a href="/terms-of-service" className="font-bold underline hover:no-underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy-policy" className="font-bold underline hover:no-underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

