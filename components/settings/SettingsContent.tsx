'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { useState } from 'react'
import BackButton from '@/components/shared/BackButton'

interface SettingsContentProps {
  profile: any
}

export default function SettingsContent({ profile }: SettingsContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      console.log('🚪 Signing out...')
      
      // Sign out client-side first
      await supabase.auth.signOut()
      
      // Clear localStorage items related to auth
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('sb-') || key.includes('auth') || key.includes('supabase'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      }
      
      // Submit to API route which will handle server-side signout and redirect
      // Use a form submission to ensure cookies are sent and redirect works properly
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = '/api/auth/signout'
      form.style.display = 'none'
      document.body.appendChild(form)
      form.submit()
      
    } catch (error) {
      console.error('❌ Logout error:', error)
      setLoggingOut(false)
      // Fallback: manually clear cookies and redirect
      if (typeof window !== 'undefined') {
        // Clear cookies
        document.cookie.split(';').forEach(cookie => {
          const eqPos = cookie.indexOf('=')
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
          if (name.startsWith('sb-')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
          }
        })
        // Redirect
        window.location.replace('/welcome')
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-8">
      {/* Back button for mobile */}
      <div className="md:hidden mb-4">
        <BackButton fallbackUrl="/profile" className="text-sm font-medium text-gray-600 hover:text-black transition-colors" />
      </div>
      
      <h1 className="text-xl md:text-2xl font-bold text-black mb-6 md:mb-8">Settings</h1>

      <div className="space-y-4">
        {/* Account Settings */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-bold text-black mb-4">Account</h2>
          <div className="space-y-3">
            <Link
              href="/profile/edit"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium text-black">Edit Profile</p>
                <p className="text-sm text-gray-600">Update your profile information</p>
              </div>
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>

            <Link
              href="/profile/account-ownership"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium text-black">Account Ownership</p>
                <p className="text-sm text-gray-600">Delete your account or download your data</p>
              </div>
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Payment & Billing - Only for scouts */}
        {profile.role === 'scout' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
            <h2 className="text-lg md:text-xl font-bold text-black mb-4">Payment & Billing</h2>
            <div className="space-y-3">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/stripe/connect/account-link', {
                      method: 'POST',
                    })
                    const data = await response.json()
                    
                    if (response.ok && data.success) {
                      const redirectUrl = data.dashboardUrl || data.onboardingUrl
                      if (redirectUrl) {
                        window.open(redirectUrl, '_blank', 'noopener,noreferrer')
                      }
                    } else {
                      alert('Failed to access Stripe account. Please try again.')
                    }
                  } catch (error) {
                    console.error('Error accessing Stripe:', error)
                    alert('Failed to access Stripe account. Please try again.')
                  }
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-black">Stripe Account</p>
                  <p className="text-sm text-gray-600">Manage your billing and payment settings</p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Legal */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-bold text-black mb-4">Legal</h2>
          <div className="space-y-3">
            <a
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium text-black">Terms of Service</p>
                <p className="text-sm text-gray-600">Our standard on service</p>
              </div>
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>

            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium text-black">Privacy Policy</p>
                <p className="text-sm text-gray-600">Our standard on privacy</p>
              </div>
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          </div>
        </div>

        {/* Support */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-bold text-black mb-4">Support</h2>
          <div className="space-y-3">
            <Link
              href="/suggest-feature"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium text-black">Suggest a Feature</p>
                <p className="text-sm text-gray-600">Share your ideas to help us improve Got1</p>
              </div>
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>

            <Link
              href="/help"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium text-black">Help & Support</p>
                <p className="text-sm text-gray-600">Get help with your account</p>
              </div>
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>

            {/* Make a Claim - Only for players and parents */}
            {(profile.role === 'player' || profile.role === 'parent') && (
              <Link
                href="/make-a-claim"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-black">Make a Claim</p>
                  <p className="text-sm text-gray-600">Submit a claim for a recent evaluation if you're not satisfied</p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full md:w-auto inline-flex items-center justify-center h-10 px-6 rounded-full border border-red-500 bg-white text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loggingOut ? 'Logging out...' : 'Log Out'}
        </button>
      </div>
    </div>
  )
}
