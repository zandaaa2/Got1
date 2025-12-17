'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { useState } from 'react'

interface SettingsContentProps {
  profile: any
}

export default function SettingsContent({ profile }: SettingsContentProps) {
  const router = useRouter()
  const supabase = createClient()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-8">
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
          </div>
        </div>
      </div>
    </div>
  )
}
