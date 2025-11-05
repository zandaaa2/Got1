'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Modal from '@/components/shared/Modal'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'signin' | 'signup'
}

export default function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false)
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
        console.log('Attempting signup for:', email)
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          },
        })
        
        if (error) {
          console.error('Signup error:', error)
          throw error
        }
        
        console.log('Signup response:', {
          user: data.user?.id,
          session: data.session?.user?.id,
          emailConfirmed: data.user?.email_confirmed_at,
        })
        
        // Note: Supabase sends confirmation email automatically if email confirmations are enabled
        // If no email is received, check Supabase dashboard settings
        setSuccess(true)
        setLoading(false)
      } else {
        // Sign in with email and password
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        // Success - redirect will happen automatically
        setLoading(false)
        onClose() // Close modal on successful signin
        window.location.href = '/' // Refresh to show logged-in state
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred')
      setLoading(false)
    }
  }

  /**
   * Handles password reset request.
   * Sends a password reset email to the user.
   *
   * @returns {Promise<void>}
   */
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      
      if (error) throw error
      setForgotPasswordSent(true)
      setLoading(false)
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
    <Modal isOpen={isOpen} onClose={onClose}>
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                  required
                  minLength={mode === 'signup' ? 6 : undefined}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-gray-600">
                  Password must be at least 6 characters long.
                </p>
              )}
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading || forgotPasswordSent}
                  className="text-sm text-gray-600 hover:text-gray-800 underline focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  I forgot my password
                </button>
              )}
              {forgotPasswordSent && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                  Password reset email sent! Check your inbox for instructions.
                </div>
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
    </Modal>
  )
}

