'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'

export default function StripeSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.replace('/welcome')
        return
      }

      setLoading(false)
    }

    checkAuth()
  }, [router, supabase])

  const handleViewStripeAccount = async () => {
    try {
      setError(null)
      const response = await fetch('/api/stripe/connect/account-link', {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        if (data.accountNotFound) {
          if (confirm('Your Stripe account is no longer valid. Would you like to create a new one?')) {
            const createResponse = await fetch('/api/stripe/connect/create-account', {
              method: 'POST',
            })
            const createData = await createResponse.json()
            
            if (createResponse.ok && createData.accountId) {
              const linkResponse = await fetch('/api/stripe/connect/account-link', {
                method: 'POST',
              })
              const linkData = await linkResponse.json()
              
              if (linkResponse.ok && linkData.success && linkData.onboardingUrl) {
                setTimeout(() => {
                  window.open(linkData.onboardingUrl, '_blank', 'noopener,noreferrer')
                }, 0)
                return
              }
            }
            alert('Failed to create new account. Please try again.')
            return
          }
          return
        }
        throw new Error(data.error || 'Failed to get account link')
      }
      
      if (data.success) {
        let redirectUrl = null
        
        if (data.dashboardUrl) {
          redirectUrl = data.dashboardUrl
        } else if (data.onboardingUrl) {
          redirectUrl = data.onboardingUrl
        } else {
          alert('Your Stripe account may need additional verification. Please try again in a few minutes or contact support.')
          return
        }
        
        setTimeout(() => {
          window.open(redirectUrl, '_blank', 'noopener,noreferrer')
        }, 0)
      } else {
        throw new Error(data.error || 'No dashboard URL available')
      }
    } catch (err: any) {
      console.error('❌ Error getting Stripe account link:', err)
      setError(err.message || 'Failed to access Stripe account. Please try again.')
    }
  }

  if (loading) {
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

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="profile" />
      <DynamicLayout header={null}>
        <main className="pt-6 md:pt-10 pb-12">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/settings"
              className="inline-flex items-center text-black hover:opacity-70 mb-6 transition-opacity"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl md:text-3xl font-normal text-black mb-8">
              Stripe Settings
            </h1>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
              <p className="text-gray-600 mb-6">
                Manage your Stripe Connect account to receive payments for evaluations. Update your billing information, payment methods, and account settings.
              </p>
              
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              
              <button
                onClick={handleViewStripeAccount}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Open Stripe Dashboard
              </button>
            </div>
          </div>
        </main>
      </DynamicLayout>
    </div>
  )
}











