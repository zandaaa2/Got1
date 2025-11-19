'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { getGradientForId } from '@/lib/gradients'
import { getProfilePath } from '@/lib/profile-url'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { openCalendly30Min } from '@/lib/calendly'

interface ProfileContentProps {
  profile: any
  hasPendingApplication: boolean
}

// Shared account status state - lifted to parent scope so MoneyDashboard can access it
let globalAccountStatus: {
  hasAccount: boolean
  onboardingComplete: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  requirementsDue: string[]
  requirementsPastDue: string[]
  requirementsReason: string | null
} | null = null

const MoneyDashboardSkeleton = () => (
  <div className="mb-8 space-y-5 rounded-lg border border-gray-200 bg-gray-50 p-6 shadow-sm animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-6 w-48 rounded bg-gray-200" />
      <div className="flex gap-2">
        <div className="h-9 w-20 rounded bg-gray-200" />
        <div className="h-9 w-28 rounded bg-gray-200" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[...Array(2)].map((_, index) => (
        <div key={index} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-8 w-1/2 rounded bg-gray-200" />
          <div className="h-4 w-2/3 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  </div>
)

type MonetizationStep = {
  id: string
  title: string
  description: string
}

const monetizationSteps: MonetizationStep[] = [
  {
    id: 'socials',
    title: 'Share on social media',
    description:
      'Add your Got1 profile link in your Instagram, Twitter/X, TikTok, and LinkedIn bios so players can reach you in one tap.',
  },
  {
    id: 'facebook',
    title: 'Post in local Facebook groups',
    description:
      'Drop your link in local recruiting, booster, and community groups so parents and players see you first.',
  },
  {
    id: 'coaches',
    title: 'Send to high school coaches',
    description:
      'Text or email your Got1 profile to the head coach and position coaches at the schools you work with.',
  },
  {
    id: 'trainers',
    title: 'Share with private trainers',
    description:
      'Send your link to trainers and 7v7 organizers who work with high school athletes in your area.',
  },
]

const StripeBannerSkeleton = () => (
  <div className="mb-6 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-5 animate-pulse">
    <div className="h-4 w-60 rounded bg-gray-200" />
    <div className="h-3 w-full rounded bg-gray-200" />
    <div className="h-3 w-2/3 rounded bg-gray-200" />
  </div>
)

const StripeStatusSkeleton = () => (
  <div className="space-y-3 pt-2 animate-pulse">
    <div className="h-4 w-3/4 rounded bg-gray-200" />
    <div className="h-3 w-2/3 rounded bg-gray-200" />
    <div className="h-10 w-40 rounded bg-gray-200" />
  </div>
)

/**
 * Money Dashboard Component
 * Shows pricing info and Stripe Connect account access for scouts with completed onboarding
 */
function MoneyDashboard({ profile }: { profile: any }) {
  const router = useRouter()
  const supabase = createClient()
  const [accountStatus, setAccountStatus] = useState<{
    hasAccount: boolean
    onboardingComplete: boolean
    chargesEnabled: boolean
    payoutsEnabled: boolean
    requirementsDue: string[]
    requirementsPastDue: string[]
    requirementsReason: string | null
  } | null>(globalAccountStatus || null)
  const [statusLoading, setStatusLoading] = useState(!globalAccountStatus)
  const [loading, setLoading] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [isEditingPricing, setIsEditingPricing] = useState(false)
  const [pricePerEval, setPricePerEval] = useState(profile.price_per_eval?.toString() || '99')
  const [turnaroundTime, setTurnaroundTime] = useState(profile.turnaround_time || '72 hrs')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [infoModal, setInfoModal] = useState<'price' | 'turnaround' | null>(null)

  useEffect(() => {
    checkAccountStatus({ suppressSkeleton: Boolean(globalAccountStatus) })
    
    // Check if returning from Stripe onboarding
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const stripeParam = urlParams.get('stripe')
      
      if (stripeParam === 'success' || stripeParam === 'refresh') {
        // Show success message
        setShowSuccessMessage(true)
        setTimeout(() => setShowSuccessMessage(false), 5000)
        
        // Wait a moment for Stripe to update, then refresh status multiple times
        console.log('📧 Detected return from Stripe onboarding')
        const refreshInterval = setInterval(() => {
          console.log('📧 Refreshing account status after Stripe return (MoneyDashboard)...')
          checkAccountStatus({ suppressSkeleton: true })
        }, 2000)
        
        // Stop refreshing after 10 seconds and clean up URL
        setTimeout(() => {
          clearInterval(refreshInterval)
          router.replace('/profile')
        }, 10000)
      }
    }
  }, [router])

  // Sync state with profile prop when profile updates
  useEffect(() => {
    setPricePerEval(profile.price_per_eval?.toString() || '99')
    const turnaround = profile.turnaround_time || '72 hrs'
    if (turnaround && !turnaround.includes('hrs')) {
      const numericValue = turnaround.replace(/[^0-9]/g, '')
      setTurnaroundTime(numericValue ? `${numericValue} hrs` : '72 hrs')
    } else {
      setTurnaroundTime(turnaround)
    }
  }, [profile.price_per_eval, profile.turnaround_time])

  const checkAccountStatus = async (options: { suppressSkeleton?: boolean } = {}) => {
    if (!options.suppressSkeleton) {
      setStatusLoading(true)
    }

    try {
      const response = await fetch('/api/stripe/connect/account-link', {
        method: 'GET',
      })
      const data = await response.json()
      console.log('📧 MoneyDashboard - Account status response:', data)
      const status = {
        hasAccount: data.hasAccount || false,
        onboardingComplete: data.onboardingComplete || false,
        chargesEnabled: data.chargesEnabled || false,
        payoutsEnabled: data.payoutsEnabled || false,
        requirementsDue: data.requirementsDue || [],
        requirementsPastDue: data.requirementsPastDue || [],
        requirementsReason: data.requirementsReason || null,
      }
      console.log('📧 MoneyDashboard - Setting status:', status)
      setAccountStatus(status)
      globalAccountStatus = status
    } catch (error) {
      console.error('Error checking account status:', error)
    } finally {
      setStatusLoading(false)
    }
  }

  const handleGetAccountLink = async () => {
    setLoading(true)
    try {
      console.log('📧 Requesting Stripe account link (MoneyDashboard)...')
      const response = await fetch('/api/stripe/connect/account-link', {
        method: 'POST',
      })
      
      console.log('📧 Response status:', response.status)
      const data = await response.json()
      console.log('📧 Response data:', data)
      
      if (!response.ok) {
        // If account not found, prompt user to create a new one
        if (data.accountNotFound) {
          if (confirm('Your Stripe account is no longer valid. Would you like to create a new one?')) {
            // Create a new account
            const createResponse = await fetch('/api/stripe/connect/create-account', {
              method: 'POST',
            })
            const createData = await createResponse.json()
            
            if (createResponse.ok && createData.accountId) {
              // Account created, now get the link
              const linkResponse = await fetch('/api/stripe/connect/account-link', {
                method: 'POST',
              })
              const linkData = await linkResponse.json()
              
              if (linkResponse.ok && linkData.success && linkData.onboardingUrl) {
                setLoading(false) // Clear loading before redirect
                setTimeout(() => {
                  window.open(linkData.onboardingUrl, '_blank', 'noopener,noreferrer')
                }, 0)
                return
              }
            }
            alert('Failed to create new account. Please try again.')
            return
          }
          return // User cancelled
        }
        throw new Error(data.error || 'Failed to get account link')
      }
      
      if (data.success) {
        let redirectUrl = null
        
        if (data.dashboardUrl) {
          console.log('📧 Opening dashboard:', data.dashboardUrl)
          redirectUrl = data.dashboardUrl
        } else if (data.onboardingUrl) {
          console.log('📧 No dashboard URL, but onboarding URL available. Opening onboarding...')
          redirectUrl = data.onboardingUrl
        } else {
          throw new Error('Your Stripe account may need additional verification. Please try again in a few minutes or contact support.')
        }
        
        // Clear loading state BEFORE redirect
        setLoading(false)
        
        // Use setTimeout(0) to ensure redirect happens in next event loop
        // This helps mobile browsers recognize it as user-initiated
        setTimeout(() => {
          window.location.href = redirectUrl
        }, 0)
        
        return
      } else {
        throw new Error(data.error || 'No dashboard URL available')
      }
    } catch (error: any) {
      console.error('❌ Error getting account link:', error)
      setLoading(false) // Ensure loading is cleared on error
      alert(`Failed to access Stripe account: ${error.message || 'Please try again.'}`)
    }
  }

  const handleSavePricing = async () => {
    setSaving(true)
    setSaveMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Validate inputs
      const price = pricePerEval ? parseFloat(pricePerEval) : null
      if (price !== null && (isNaN(price) || price <= 0)) {
        throw new Error('Price must be a positive number')
      }

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          price_per_eval: price,
          turnaround_time: turnaroundTime || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id)
        .select() // Return updated data

      if (updateError) {
        console.error('❌ Update error details:', updateError)
        throw new Error(updateError.message || 'Failed to update profile')
      }

      if (!data || data.length === 0) {
        throw new Error('Profile not found or update failed')
      }

      setSaveMessage('Saved successfully!')
      setIsEditingPricing(false)
      setTimeout(() => setSaveMessage(null), 3000)
      
      // Force refresh
      router.refresh()
      
      // Also update local state immediately
      setPricePerEval(data[0].price_per_eval?.toString() || '99')
      setTurnaroundTime(data[0].turnaround_time || '72 hrs')
      
    } catch (error: any) {
      console.error('❌ Error saving pricing:', error)
      // Show actual error message to help debug
      setSaveMessage(error.message || 'Failed to save. Please try again.')
      setTimeout(() => setSaveMessage(null), 5000) // Show error longer
    } finally {
      setSaving(false)
    }
  }

  if (statusLoading) {
    return <MoneyDashboardSkeleton />
  }

  // Only show if account is complete
  if (!accountStatus) {
    console.log('📧 MoneyDashboard - No account status yet, showing nothing')
    return null
  }
  
  const isFullyEnabled = accountStatus.onboardingComplete && accountStatus.chargesEnabled && accountStatus.payoutsEnabled
  
  if (!isFullyEnabled) {
    console.log('📧 MoneyDashboard - Account not fully enabled, hiding dashboard. Status:', accountStatus)
    return null
  }
  
  console.log('📧 MoneyDashboard - Account fully enabled! Showing dashboard. Status:', accountStatus)

  return (
    <div className="surface-card mb-8 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-lg md:text-xl font-bold text-black">Payouts and Turnaround Time</h3>
        <div className="hidden sm:flex flex-row gap-2">
          <button
            onClick={() => setIsEditingPricing(!isEditingPricing)}
            className="interactive-press inline-flex items-center justify-center h-9 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Edit
          </button>
          <button
            onClick={handleGetAccountLink}
            disabled={loading}
            className="interactive-press inline-flex items-center justify-center h-9 px-4 rounded-full bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'View Dashboard'}
          </button>
        </div>
      </div>
      {showSuccessMessage && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm text-green-800">
            ✅ Your Stripe Connect account has been successfully set up!
          </p>
        </div>
      )}
      {saveMessage && (
        <div className={`mb-4 rounded-2xl p-3 ${saveMessage.includes('Failed') ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          <p className="text-sm">{saveMessage}</p>
        </div>
      )}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="surface-card p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs md:text-sm text-gray-600">Price per Evaluation</p>
              <button
                onClick={() => setInfoModal('price')}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                title="More information"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            {isEditingPricing ? (
              <input
                type="number"
                value={pricePerEval}
                onChange={(e) => setPricePerEval(e.target.value)}
                className="text-xl md:text-2xl font-bold text-black border border-gray-300 rounded px-2 py-1 w-full"
                placeholder="99"
              />
            ) : (
              <p className="text-xl md:text-2xl font-bold text-black">${profile.price_per_eval || 99}</p>
            )}
          </div>
          <div className="surface-card p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs md:text-sm text-gray-600">Turnaround Time</p>
              <button
                onClick={() => setInfoModal('turnaround')}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                title="More information"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            {isEditingPricing ? (
              <input
                type="text"
                value={turnaroundTime}
                onChange={(e) => setTurnaroundTime(e.target.value)}
                className="text-xl md:text-2xl font-bold text-black border border-gray-300 rounded px-2 py-1 w-full"
                placeholder="72 hrs"
              />
            ) : (
              <p className="text-xl md:text-2xl font-bold text-black">{profile.turnaround_time || '72 hrs'}</p>
            )}
          </div>
        </div>
        {/* Mobile buttons - shown below cards on mobile, hidden on desktop */}
        <div className="flex flex-col gap-2 sm:hidden">
          <button
            onClick={() => setIsEditingPricing(!isEditingPricing)}
            className="interactive-press inline-flex items-center justify-center h-9 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-100 w-full"
          >
            Edit
          </button>
          <button
            onClick={handleGetAccountLink}
            disabled={loading}
            className="interactive-press inline-flex items-center justify-center h-9 px-4 rounded-full bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            {loading ? 'Loading...' : 'View Dashboard'}
          </button>
        </div>
        {isEditingPricing && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSavePricing}
              disabled={saving}
              className="interactive-press inline-flex items-center justify-center h-10 px-5 rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => {
                setIsEditingPricing(false)
                setPricePerEval(profile.price_per_eval?.toString() || '99')
                setTurnaroundTime(profile.turnaround_time || '72 hrs')
                setSaveMessage(null)
              }}
              className="interactive-press inline-flex items-center justify-center h-10 px-5 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Information Modal */}
      {infoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setInfoModal(null)}>
          <div className="surface-card max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-black">
                {infoModal === 'price' ? 'Price per Evaluation' : 'Turnaround Time'}
              </h3>
              <button
                onClick={() => setInfoModal(null)}
                className="interactive-press text-gray-500 hover:text-black text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="text-black mb-4">
              {infoModal === 'price' ? (
                <p className="leading-relaxed">
                  This is the price players will pay to purchase an evaluation from you. Set this based on your experience level, 
                  the depth of analysis you provide, and the market rate for similar services. Players will see this price when 
                  browsing scouts and will pay this amount when they request an evaluation.
                </p>
              ) : (
                <p className="leading-relaxed">
                  This is the estimated time it takes you to complete and deliver an evaluation after a player purchases one. 
                  Common examples include "24 hrs", "48 hrs", "1 week", etc. This helps players understand when they can expect 
                  to receive their evaluation and sets clear expectations for your service. The default turnaround time is 72 hours.
                </p>
              )}
            </div>
            <button
              onClick={() => setInfoModal(null)}
              className="interactive-press w-full px-6 py-3 rounded-full bg-black text-sm font-semibold text-white hover:bg-gray-900"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Stripe Connect Section Component
 * Allows scouts to access their Stripe Connect account for payouts
 */
function StripeConnectSection({ profile }: { profile: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [accountStatus, setAccountStatus] = useState<{
    hasAccount: boolean
    onboardingComplete: boolean
    chargesEnabled: boolean
    payoutsEnabled: boolean
    requirementsDue: string[]
    requirementsPastDue: string[]
    requirementsReason: string | null
  } | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [notificationSent, setNotificationSent] = useState(false)
  const [stripeIssueNotificationSent, setStripeIssueNotificationSent] = useState(false)
  const [readyNotificationSent, setReadyNotificationSent] = useState(false)
  const [wasFullyEnabled, setWasFullyEnabled] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobileDevice(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Check account status on mount
    checkAccountStatus({ suppressSkeleton: Boolean(globalAccountStatus) })
    
    // Check if returning from Stripe onboarding
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const stripeParam = urlParams.get('stripe')
      
      if (stripeParam === 'success' || stripeParam === 'refresh') {
        // Wait longer for Stripe to fully process the onboarding before first check
        console.log('📧 Detected return from Stripe onboarding')
        
        // Initial delay before first check (Stripe needs time to process)
        setTimeout(() => {
          console.log('📧 Checking account status after Stripe return (first check after 3s delay)...')
          checkAccountStatus({ suppressSkeleton: true })
          
          // Then check multiple times with delays
          let checkCount = 0
        const refreshInterval = setInterval(() => {
            checkCount++
            console.log(`📧 Refreshing account status after Stripe return (attempt ${checkCount + 1})...`)
          checkAccountStatus({ suppressSkeleton: true })
        
            // Stop after 5 additional checks (10 seconds) and clean up URL
            if (checkCount >= 5) {
          clearInterval(refreshInterval)
          router.replace('/profile')
            }
          }, 2000)
        }, 3000) // Wait 3 seconds before first check to give Stripe time to process
      }
    }
  }, [router])

  const checkAccountStatus = async (options: { suppressSkeleton?: boolean } = {}) => {
    if (!options.suppressSkeleton) {
      setStatusLoading(true)
    }

    try {
      const response = await fetch('/api/stripe/connect/account-link', {
        method: 'GET',
      })
      const data = await response.json()
      const status = {
        hasAccount: data.hasAccount || false,
        onboardingComplete: data.onboardingComplete || false,
        chargesEnabled: data.chargesEnabled || false,
        payoutsEnabled: data.payoutsEnabled || false,
        requirementsDue: data.requirementsDue || [],
        requirementsPastDue: data.requirementsPastDue || [],
        requirementsReason: data.requirementsReason || null,
      }
      setAccountStatus(status)
      globalAccountStatus = status // Update global state
    } catch (error) {
      console.error('Error checking account status:', error)
    } finally {
      setStatusLoading(false)
    }
  }

  const isFullyEnabled = !!accountStatus && accountStatus.onboardingComplete && accountStatus.chargesEnabled && accountStatus.payoutsEnabled
  const needsUpdate = !!accountStatus && accountStatus.onboardingComplete && !(accountStatus.chargesEnabled && accountStatus.payoutsEnabled)
  const onboardingDisabled = isMobileDevice && !isFullyEnabled

  useEffect(() => {
    const sendNotification = async () => {
      // Check sessionStorage to see if we've already sent a notification for this specific state
      const storageKey = `stripe_requirements_notified_${profile.user_id}`
      const requirementsKey = JSON.stringify({
        due: accountStatus?.requirementsDue || [],
        pastDue: accountStatus?.requirementsPastDue || [],
      })
      const lastNotifiedKey = sessionStorage.getItem(storageKey)
      
      // Only send if this is a NEW requirements state
      if (lastNotifiedKey === requirementsKey) {
        return // Already notified for this exact state
      }
      
      try {
        const response = await fetch('/api/stripe/connect/requirements-notice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requirementsDue: accountStatus?.requirementsDue || [],
            requirementsPastDue: accountStatus?.requirementsPastDue || [],
          }),
        })
        if (response.ok) {
          sessionStorage.setItem(storageKey, requirementsKey) // Remember this state
          setNotificationSent(true)
        } else {
          console.error('Failed to send requirements email')
        }
      } catch (error) {
        console.error('Error sending requirements email:', error)
      }
    }

    if (needsUpdate && !notificationSent) {
      sendNotification()
    }
  }, [needsUpdate, notificationSent, accountStatus?.requirementsDue, accountStatus?.requirementsPastDue, profile.user_id])

  // Create in-app notification when Stripe has issues
  useEffect(() => {
    const createStripeIssueNotification = async () => {
      if (needsUpdate && accountStatus && !stripeIssueNotificationSent) {
        // Check sessionStorage to see if we've already created a notification for this specific state
        const storageKey = `stripe_issue_notified_${profile.user_id}`
        const requirementsKey = JSON.stringify({
          due: accountStatus.requirementsDue || [],
          pastDue: accountStatus.requirementsPastDue || [],
          reason: accountStatus.requirementsReason,
        })
        const lastNotifiedKey = sessionStorage.getItem(storageKey)
        
        // Only create if this is a NEW requirements state
        if (lastNotifiedKey === requirementsKey) {
          return // Already notified for this exact state
        }
        
        try {
          const response = await fetch('/api/notifications/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'stripe_account_issue',
              title: 'Stripe Account Action Required',
              message: 'Your Stripe account needs attention. Please resolve the requirements to enable payouts.',
              link: '/profile',
              metadata: {
                requirementsDue: accountStatus.requirementsDue || [],
                requirementsPastDue: accountStatus.requirementsPastDue || [],
                requirementsReason: accountStatus.requirementsReason,
              },
            }),
          })
          if (response.ok) {
            sessionStorage.setItem(storageKey, requirementsKey) // Remember this state
            setStripeIssueNotificationSent(true)
          }
        } catch (error) {
          console.error('Error creating Stripe issue notification:', error)
        }
      }
    }

    createStripeIssueNotification()
  }, [needsUpdate, accountStatus, stripeIssueNotificationSent, profile.user_id])

  // Create notification when scout becomes fully ready to earn
  // Use sessionStorage to track if we've checked this browser session (persists across remounts)
  useEffect(() => {
    // Only check if account is fully enabled
    if (isFullyEnabled && accountStatus) {
      const checkAndCreateReadyNotification = async () => {
        try {
          // Check sessionStorage first - if we've already checked this session, skip
          const storageKey = `scout_ready_checked_${profile.user_id}`
          const hasCheckedThisSession = sessionStorage.getItem(storageKey) === 'true'
          
          if (hasCheckedThisSession) {
            console.log('⏭️ Already checked scout_ready_to_earn this session (sessionStorage)')
            return
          }
          
          const supabase = createClient()
          
          // ALWAYS check database first - this is the single source of truth
          // Check if notification exists EVER, and also check if one was created in last minute (prevent race conditions)
          const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id, created_at')
            .eq('user_id', profile.user_id)
            .eq('type', 'scout_ready_to_earn')
            .maybeSingle()
          
          if (existingNotification) {
            // Notification already exists - mark sessionStorage and stop
            sessionStorage.setItem(storageKey, 'true')
            console.log('⏭️ scout_ready_to_earn notification already exists in database (created:', existingNotification.created_at, ')')
            return
          }
          
          // Also check for very recent notifications (within last minute) to prevent race conditions
          const { data: recentNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', profile.user_id)
            .eq('type', 'scout_ready_to_earn')
            .gte('created_at', oneMinuteAgo)
            .maybeSingle()
          
          if (recentNotification) {
            // Very recent notification exists - mark sessionStorage and stop
            sessionStorage.setItem(storageKey, 'true')
            console.log('⏭️ Very recent scout_ready_to_earn notification exists (within last minute)')
            return
          }
          
          // Mark as checked BEFORE creating to prevent duplicates
          sessionStorage.setItem(storageKey, 'true')
          
          // Notification doesn't exist - create it (this should only happen once ever)
          console.log('Creating scout_ready_to_earn notification (first time)')
          const response = await fetch('/api/notifications/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'scout_ready_to_earn',
              title: 'Congratulations! You\'re Ready to Earn',
              message: 'Your Stripe account is fully set up! You can now start receiving evaluation requests and earning money.',
              link: '/browse',
              metadata: {
                chargesEnabled: accountStatus.chargesEnabled,
                payoutsEnabled: accountStatus.payoutsEnabled,
              },
            }),
          })
          if (response.ok) {
            console.log('✅ scout_ready_to_earn notification created')
          } else {
            const error = await response.json().catch(() => ({}))
            console.error('Failed to create scout_ready_to_earn notification:', error)
            sessionStorage.removeItem(storageKey) // Remove on error so we can retry
          }
        } catch (error) {
          console.error('Error creating ready notification:', error)
          const storageKey = `scout_ready_checked_${profile.user_id}`
          sessionStorage.removeItem(storageKey) // Remove on error so we can retry
        }
      }

      checkAndCreateReadyNotification()
    } else if (!isFullyEnabled) {
      // Reset sessionStorage when not fully enabled so we can check again if they become enabled later
      const storageKey = `scout_ready_checked_${profile.user_id}`
      sessionStorage.removeItem(storageKey)
      setWasFullyEnabled(false)
      setReadyNotificationSent(false)
    }
  }, [isFullyEnabled, accountStatus, profile.user_id])

  // Hide this section if account is fully enabled (Money Dashboard will show instead)
  if (isFullyEnabled) {
    return null
  }

  const handleGetAccountLink = async () => {
    setLoading(true)
    try {
      console.log('📧 Requesting Stripe account link...')
      const response = await fetch('/api/stripe/connect/account-link', {
        method: 'POST',
      })
      
      console.log('📧 Response status:', response.status)
      const data = await response.json()
      console.log('📧 Response data:', data)
      
      if (!response.ok) {
        // If account not found, prompt user to create a new one
        if (data.accountNotFound) {
          if (confirm('Your Stripe account is no longer valid. Would you like to create a new one?')) {
            // Create a new account
            const createResponse = await fetch('/api/stripe/connect/create-account', {
              method: 'POST',
            })
            const createData = await createResponse.json()
            
            if (createResponse.ok && createData.accountId) {
              // Account created, now get the link
              const linkResponse = await fetch('/api/stripe/connect/account-link', {
                method: 'POST',
              })
              const linkData = await linkResponse.json()
              
              if (linkResponse.ok && linkData.success && linkData.onboardingUrl) {
                setLoading(false) // Clear loading before redirect
                setTimeout(() => {
                  window.open(linkData.onboardingUrl, '_blank', 'noopener,noreferrer')
                }, 0)
                return
              }
            }
            alert('Failed to create new account. Please try again.')
            return
          }
          return // User cancelled
        }
        throw new Error(data.error || 'Failed to get account link')
      }
      
      if (data.success) {
        let redirectUrl = null
        
        // If onboarding is complete, open dashboard; otherwise open onboarding
        if (data.onboardingComplete && data.dashboardUrl) {
          console.log('📧 Opening dashboard in new tab:', data.dashboardUrl)
          redirectUrl = data.dashboardUrl
        } else if (data.onboardingUrl) {
          console.log('📧 Opening onboarding in new tab:', data.onboardingUrl)
          redirectUrl = data.onboardingUrl
        } else {
          console.error('❌ No onboarding or dashboard URL returned')
          alert('Failed to get account link. Please try again.')
          return
        }
        
        // Clear loading state BEFORE redirect
        setLoading(false)
        
        // Use setTimeout(0) to ensure redirect happens in next event loop
        // This helps mobile browsers recognize it as user-initiated
        setTimeout(() => {
          window.open(redirectUrl, '_blank', 'noopener,noreferrer')
        }, 0)
        
        return
      } else {
        throw new Error(data.error || 'Failed to get account link')
      }
    } catch (error: any) {
      console.error('❌ Error getting account link:', error)
      setLoading(false) // Ensure loading is cleared on error
      alert(`Failed to access Stripe account: ${error.message || 'Please try again.'}`)
    }
  }

  const containerClass = `surface-card mb-8 p-6 ${needsUpdate ? 'border-yellow-200 bg-yellow-50' : ''}`

  return (
    <div className={containerClass}>
      {statusLoading ? (
        <StripeStatusSkeleton />
      ) : accountStatus ? (
        <div className="space-y-3">
          {accountStatus.hasAccount ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className={`h-2 w-2 rounded-full ${needsUpdate ? 'bg-amber-500' : accountStatus.onboardingComplete ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                <span className="text-gray-700">
                  {needsUpdate
                    ? 'Stripe placed payouts on hold until you upload the requested details.'
                    : accountStatus.onboardingComplete
                      ? 'You’re fully verified — payouts go out automatically after each evaluation.'
                      : 'Finish setting up Stripe Connect so Got1 can pay you after each evaluation.'}
                </span>
              </div>
              {needsUpdate ? (
                <p className="text-xs text-gray-600">
                  Review Stripe’s checklist to lift the payout hold. As soon as you submit everything, payouts resume automatically.
                </p>
              ) : (
                !accountStatus.onboardingComplete && (
                  <p className="text-xs text-gray-600">Setup usually takes about 3–5 minutes.</p>
                )
              )}
              <button
                onClick={handleGetAccountLink}
                disabled={loading || onboardingDisabled}
                className={`interactive-press inline-flex items-center justify-center h-10 px-5 rounded-full font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed ${needsUpdate ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {onboardingDisabled
                  ? 'Desktop Required'
                  : loading
                    ? 'Loading...'
                    : needsUpdate
                      ? 'Resolve Stripe Requirements'
                      : accountStatus.onboardingComplete
                        ? 'Open Stripe Dashboard'
                        : 'Finish Stripe Setup'}
              </button>
              {onboardingDisabled && (
                <p className="text-xs text-gray-500">
                  Stripe onboarding can only be completed on desktop. Please switch to a laptop or desktop computer.
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                <p>Create your Stripe Connect account so Got1 can pay you after each completed evaluation.</p>
                <p className="mt-2 text-xs text-gray-600">Most scouts finish this step in 3–5 minutes.</p>
              </div>
              <button
                onClick={async () => {
                  if (onboardingDisabled) {
                    alert('Please finish Stripe setup on a desktop device. Mobile onboarding is currently disabled to avoid issues.')
                    return
                  }
                  setLoading(true)
                  try {
                    // Step 1: Create the account
                    const response = await fetch('/api/stripe/connect/create-account', {
                      method: 'POST',
                    })
                    const data = await response.json()
                    
                    if (data.success && data.accountId) {
                      // Step 2: Wait a moment for DB to update
                      await new Promise(resolve => setTimeout(resolve, 500))
                      
                      // Step 3: Get the onboarding link immediately
                      const linkResponse = await fetch('/api/stripe/connect/account-link', {
                        method: 'POST',
                      })
                      const linkData = await linkResponse.json()
                      
                      if (linkResponse.ok && linkData.success) {
                        if (linkData.onboardingUrl) {
                          // Step 4: Open Stripe onboarding in new tab immediately
                          window.open(linkData.onboardingUrl, '_blank', 'noopener,noreferrer')
                          return
                        } else if (linkData.dashboardUrl) {
                          // If already onboarded (shouldn't happen, but handle it)
                          window.open(linkData.dashboardUrl, '_blank', 'noopener,noreferrer')
                          return
                        }
                      }
                      
                      // Fallback: refresh status
                      alert('Account created! Please click "Finish Stripe Setup" to continue.')
                      checkAccountStatus()
                      router.refresh()
                    } else {
                      alert(`Failed to create account: ${data.error || 'Unknown error'}`)
                    }
                  } catch (error) {
                    console.error('Error creating account:', error)
                    alert('Failed to create account. Please try again.')
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading || onboardingDisabled}
                className="interactive-press inline-flex items-center justify-center h-10 px-5 rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {onboardingDisabled ? 'Desktop Required' : loading ? 'Creating...' : 'Start Stripe Setup'}
              </button>
              {onboardingDisabled && (
                <p className="text-xs text-gray-500">
                  Stripe onboarding can only be completed on desktop. Please switch to a laptop or desktop computer.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-600">
          <p>We couldn't load your Stripe status. Please refresh.</p>
        </div>
      )}
    </div>
  )
}

export default function ProfileContent({ profile, hasPendingApplication }: ProfileContentProps) {
  const [isScoutStatusMinimized, setIsScoutStatusMinimized] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const [pricePerEval, setPricePerEval] = useState(profile.price_per_eval?.toString() || '99')
  const [turnaroundTime, setTurnaroundTime] = useState(profile.turnaround_time || '72 hrs')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [isEditingPricing, setIsEditingPricing] = useState(false)
  const [infoModal, setInfoModal] = useState<'price' | 'turnaround' | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const checklistStorageKey = useMemo(
    () => `money-checklist-${profile.user_id || profile.id || profile.username}`,
    [profile.id, profile.user_id, profile.username]
  )
  const [moneyChecklist, setMoneyChecklist] = useState<boolean[]>(
    () => new Array(monetizationSteps.length).fill(false)
  )
  const [isMoneyChecklistMinimized, setIsMoneyChecklistMinimized] = useState(false)
  const [isMoneyWidgetDismissed, setIsMoneyWidgetDismissed] = useState(false)
  const [stripeAccountApproved, setStripeAccountApproved] = useState(false)
  const [widgetCopyStatus, setWidgetCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const completedSteps = moneyChecklist.filter(Boolean).length
  const canMinimizeChecklist = completedSteps === monetizationSteps.length
  const progressPercent = monetizationSteps.length
    ? Math.round((completedSteps / monetizationSteps.length) * 100)
    : 0
  
  // Check if widget has been dismissed
  const widgetDismissedKey = useMemo(
    () => `money-widget-dismissed-${profile.user_id || profile.id || profile.username}`,
    [profile.id, profile.user_id, profile.username]
  )
  const profilePath = getProfilePath(profile.id, profile.username)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://got1.app').replace(/\/$/, '')
  const fullProfileUrl = `${appUrl}${profilePath}`
  const displayProfileUrl = `${appUrl.replace(/^https?:\/\//, '')}${profilePath}`
  const profileGradientKey =
    profile.user_id || profile.id || profile.username || profile.full_name || 'profile'
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const storedChecklist = window.localStorage.getItem(checklistStorageKey)
      if (storedChecklist) {
        const parsed = JSON.parse(storedChecklist)
        if (Array.isArray(parsed) && parsed.length === monetizationSteps.length) {
          setMoneyChecklist(parsed)
        }
      }
      const storedMinimized = window.localStorage.getItem(`${checklistStorageKey}-minimized`)
      if (storedMinimized) {
        setIsMoneyChecklistMinimized(storedMinimized === 'true')
      }
      // Check if widget has been dismissed
      const dismissed = window.localStorage.getItem(widgetDismissedKey)
      if (dismissed === 'true') {
        setIsMoneyWidgetDismissed(true)
      }
    } catch (error) {
      console.error('Failed to load monetization checklist state:', error)
    }
  }, [checklistStorageKey, widgetDismissedKey])
  
  // Check if Stripe account is fully approved
  useEffect(() => {
    if (profile.role !== 'scout') return
    
    const checkStripeApproval = async () => {
      try {
        const response = await fetch('/api/stripe/connect/account-link')
        const data = await response.json()
        if (data.chargesEnabled && data.payoutsEnabled) {
          setStripeAccountApproved(true)
        }
      } catch (error) {
        console.error('Failed to check Stripe approval:', error)
      }
    }
    
    checkStripeApproval()
  }, [profile.role])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(checklistStorageKey, JSON.stringify(moneyChecklist))
      // If all steps completed, dismiss the widget permanently
      if (canMinimizeChecklist && completedSteps === monetizationSteps.length) {
        window.localStorage.setItem(widgetDismissedKey, 'true')
        setIsMoneyWidgetDismissed(true)
      }
    } catch (error) {
      console.error('Failed to persist monetization checklist state:', error)
    }
  }, [moneyChecklist, checklistStorageKey, widgetDismissedKey, canMinimizeChecklist, completedSteps])

  useEffect(() => {
    if (!canMinimizeChecklist && isMoneyChecklistMinimized) {
      setIsMoneyChecklistMinimized(false)
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(`${checklistStorageKey}-minimized`, 'false')
        } catch (error) {
          console.error('Failed to persist monetization checklist minimized state:', error)
        }
      }
      return
    }

    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        `${checklistStorageKey}-minimized`,
        isMoneyChecklistMinimized.toString()
      )
    } catch (error) {
      console.error('Failed to persist monetization checklist minimized state:', error)
    }
  }, [canMinimizeChecklist, isMoneyChecklistMinimized, checklistStorageKey])

  const toggleChecklistStep = (index: number) => {
    setMoneyChecklist((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  const handleToggleChecklistVisibility = () => {
    if (!canMinimizeChecklist) return
    setIsMoneyChecklistMinimized((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            `${checklistStorageKey}-minimized`,
            next.toString()
          )
        } catch (error) {
          console.error('Failed to persist monetization checklist minimized state:', error)
        }
      }
      return next
    })
  }
  
  const handleDismissWidget = () => {
    setIsMoneyWidgetDismissed(true)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(widgetDismissedKey, 'true')
      } catch (error) {
        console.error('Failed to persist widget dismissal:', error)
      }
    }
  }
  
  const handleWidgetCopyUrl = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullProfileUrl)
      } else {
        const tempInput = document.createElement('textarea')
        tempInput.value = fullProfileUrl
        tempInput.setAttribute('readonly', '')
        tempInput.style.position = 'absolute'
        tempInput.style.left = '-9999px'
        document.body.appendChild(tempInput)
        tempInput.select()
        document.execCommand('copy')
        document.body.removeChild(tempInput)
      }
      setWidgetCopyStatus('copied')
      setTimeout(() => setWidgetCopyStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to copy profile link:', error)
      setWidgetCopyStatus('error')
      setTimeout(() => setWidgetCopyStatus('idle'), 2000)
    }
  }
  
  // Find the next incomplete step
  const nextIncompleteStep = monetizationSteps.find((_, index) => !moneyChecklist[index])
  const nextStepIndex = monetizationSteps.findIndex((_, index) => !moneyChecklist[index])


  // Check if returning from Stripe and force refresh
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const stripeParam = urlParams.get('stripe')
      
      if (stripeParam === 'success' || stripeParam === 'refresh') {
        console.log('📧 Detected return from Stripe, refreshing page...')
        // Force multiple refreshes to catch Stripe's status update
        let refreshCount = 0
        const refreshInterval = setInterval(() => {
          refreshCount++
          console.log(`📧 Refreshing page (attempt ${refreshCount})...`)
          router.refresh()
          setRefreshKey(prev => prev + 1)
          
          // Stop after 5 refreshes (10 seconds) and clean up URL
          if (refreshCount >= 5) {
            clearInterval(refreshInterval)
            router.replace('/profile')
          }
        }, 2000)
      }
    }
  }, [router])

  /**
   * Syncs state with profile prop when profile updates.
   */
  useEffect(() => {
    setPricePerEval(profile.price_per_eval?.toString() || '99')
    // Handle turnaround time - if it already has "hrs", keep it, otherwise format it
    const turnaround = profile.turnaround_time || '72 hrs'
    if (turnaround && !turnaround.includes('hrs')) {
      // If it's just a number, add "hrs" suffix
      const numericValue = turnaround.replace(/[^0-9]/g, '')
      setTurnaroundTime(numericValue ? `${numericValue} hrs` : '72 hrs')
    } else {
      setTurnaroundTime(turnaround)
    }
  }, [profile.price_per_eval, profile.turnaround_time])

  /**
   * Handles user logout by signing out from Supabase and redirecting to home.
   *
   * @returns {Promise<void>}
   */
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  /**
   * Handles saving price and turnaround time updates.
   * Updates the profile with new values.
   *
   * @returns {Promise<void>}
   */
  const handleSavePricing = async () => {
    setSaving(true)
    setSaveMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Validate inputs
      const price = pricePerEval ? parseFloat(pricePerEval) : null
      if (price !== null && (isNaN(price) || price <= 0)) {
        throw new Error('Price must be a positive number')
      }

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          price_per_eval: price,
          turnaround_time: turnaroundTime || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id)
        .select() // Return updated data

      if (updateError) {
        console.error('❌ Update error details:', updateError)
        throw new Error(updateError.message || 'Failed to update profile')
      }

      if (!data || data.length === 0) {
        throw new Error('Profile not found or update failed')
      }

      setSaveMessage('Saved successfully!')
      setIsEditingPricing(false)
      setTimeout(() => setSaveMessage(null), 3000)
      
      // Force refresh
      router.refresh()
      
      // Also update local state immediately
      setPricePerEval(data[0].price_per_eval?.toString() || '99')
      setTurnaroundTime(data[0].turnaround_time || '72 hrs')
      
    } catch (error: any) {
      console.error('❌ Error saving pricing:', error)
      // Show actual error message to help debug
      setSaveMessage(error.message || 'Failed to save. Please try again.')
      setTimeout(() => setSaveMessage(null), 5000) // Show error longer
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handles getting Stripe account link from General Info section
   */
  const handleViewStripeAccount = async () => {
    try {
      const response = await fetch('/api/stripe/connect/account-link', {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // If account not found, prompt user to create a new one
        if (data.accountNotFound) {
          if (confirm('Your Stripe account is no longer valid. Would you like to create a new one?')) {
            // Create a new account
            const createResponse = await fetch('/api/stripe/connect/create-account', {
              method: 'POST',
            })
            const createData = await createResponse.json()
            
            if (createResponse.ok && createData.accountId) {
              // Account created, now get the link
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
          return // User cancelled
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
        
        // Use setTimeout(0) to ensure redirect happens in next event loop
        // This helps mobile browsers recognize it as user-initiated
        setTimeout(() => {
          window.open(redirectUrl, '_blank', 'noopener,noreferrer')
        }, 0)
      } else {
        throw new Error(data.error || 'No dashboard URL available')
      }
    } catch (error: any) {
      console.error('❌ Error getting Stripe account link:', error)
      alert(`Failed to access Stripe account: ${error.message || 'Please try again.'}`)
    }
  }

  const handleCopyProfileUrl = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullProfileUrl)
      } else {
        const tempInput = document.createElement('textarea')
        tempInput.value = fullProfileUrl
        tempInput.setAttribute('readonly', '')
        tempInput.style.position = 'absolute'
        tempInput.style.left = '-9999px'
        document.body.appendChild(tempInput)
        tempInput.select()
        document.execCommand('copy')
        document.body.removeChild(tempInput)
      }
      setCopyStatus('copied')
      window.setTimeout(() => setCopyStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to copy profile link:', error)
      setCopyStatus('error')
      window.setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }

  const copyButtonLabel =
    copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Try again' : 'Copy'

  const profileLinkElement = (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <a
        href={fullProfileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-blue-600 hover:underline break-all"
      >
        {displayProfileUrl}
      </a>
      <button
        type="button"
        onClick={handleCopyProfileUrl}
        className="interactive-press inline-flex items-center gap-1 rounded-full border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        aria-live="polite"
        aria-label="Copy profile link"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 13a3 3 0 010-6h2" />
          <path d="M11 7a3 3 0 010 6H9" />
          <rect x="4" y="4" width="12" height="12" rx="3" />
        </svg>
        <span>{copyButtonLabel}</span>
      </button>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-8">Profile</h1>

      {/* Profile Card */}
      <div className="surface-card flex flex-row flex-wrap md:flex-nowrap items-start gap-4 md:gap-6 mb-6 md:mb-8 p-4 md:p-6">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex-shrink-0 mx-auto md:mx-0">
          {isMeaningfulAvatar(profile.avatar_url) && !imageErrors.has(`profile-${profile.id}`) ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name || 'Profile'}
              width={96}
              height={96}
              className="w-full h-full object-cover"
              onError={() => {
                setImageErrors((prev) => {
                  const next = new Set(prev)
                  next.add(`profile-${profile.id}`)
                  return next
                })
              }}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${getGradientForId(profileGradientKey)}`}>
              <span className="text-white text-3xl font-semibold">
                {profile.full_name?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 text-left">
          <h2 className="text-xl font-bold text-black mb-1">
            {profile.full_name || 'Unknown'}
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            {profile.username && <span className="text-gray-500">@{profile.username}</span>}
          </div>
          {profileLinkElement}
          {profile.role === 'scout' ? (
            (profile.position || profile.organization) && (
              <p className="text-black mb-1">
                {profile.position && profile.organization
                  ? `${profile.position} at ${profile.organization}`
                  : profile.position || profile.organization}
              </p>
            )
          ) : (
            <>
              {profile.position && (
                <p className="text-black mb-1">{profile.position}</p>
              )}
              {profile.school && (
                <p className="text-black mb-1">
                  {profile.school}
                  {profile.graduation_year && `, ${profile.graduation_year}`}
                </p>
              )}
            </>
          )}
        </div>
        <Link
          href="/profile/edit"
          className="interactive-press inline-flex items-center justify-center h-10 px-5 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit
        </Link>
      </div>

      {/* Stripe Connect Account Section - Only show for scouts */}
      {profile.role === 'scout' && <StripeConnectSection key={`stripe-${refreshKey}`} profile={profile} />}

      {/* Money Dashboard - Only show for scouts with completed Stripe Connect account */}
      {profile.role === 'scout' && <MoneyDashboard key={`money-${refreshKey}`} profile={profile} />}

      {/* Floating "How to make money" widget - only shows once for approved Stripe accounts */}
      {profile.role === 'scout' && 
       stripeAccountApproved && 
       !isMoneyWidgetDismissed && (
        <div className="fixed bottom-4 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ backgroundColor: '#FFEB3B' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFEB3B' }}>
                <span className="text-lg">💰</span>
              </div>
              <h3 className="text-base font-bold text-black">How to make money</h3>
            </div>
            <button
              onClick={handleDismissWidget}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <span>{completedSteps} of {monetizationSteps.length} completed</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Next Up Section */}
          {nextIncompleteStep && nextStepIndex !== -1 ? (
            <div className="p-4">
              <div className="mb-2">
                <p className="text-xs text-gray-500">Next Up</p>
                <p className="text-xs text-gray-400">Estimated: 15 minutes</p>
              </div>
              <h4 className="text-sm font-bold text-black mb-1">{nextIncompleteStep.title}</h4>
              <p className="text-xs text-gray-600 mb-4">{nextIncompleteStep.description}</p>
              
              {/* Profile Link Section - Always shown */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={displayProfileUrl}
                    readOnly
                    className="flex-1 text-xs text-gray-700 bg-white border border-gray-300 rounded px-2 py-1.5 font-mono truncate min-w-0"
                  />
                  <button
                    onClick={handleWidgetCopyUrl}
                    className={`interactive-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 whitespace-nowrap ${
                      widgetCopyStatus === 'copied'
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : widgetCopyStatus === 'error'
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {widgetCopyStatus === 'copied' ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : widgetCopyStatus === 'error' ? (
                      'Try again'
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                  </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => toggleChecklistStep(nextStepIndex)}
                  className="w-full px-4 py-2 rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Mark Complete
                </button>
              </div>
            </div>
          ) : (
            /* Completed State */
            <div className="p-4 text-center">
              <div className="mb-3">
                <svg className="w-12 h-12 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-black mb-2">All steps complete! 🎉</h4>
              <p className="text-xs text-gray-600 mb-4">You're all set to start earning.</p>
              <button
                onClick={handleDismissWidget}
                className="w-full px-4 py-2 rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Got it
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scout Status Section - Only show if user is a base user (not player or scout) */}
      {profile.role === 'user' && (
        <div className="surface-card mb-8 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-black">Scout Status</h3>
            <button
              onClick={() => setIsScoutStatusMinimized(!isScoutStatusMinimized)}
              className="text-gray-500 hover:text-black transition-colors"
              aria-label={isScoutStatusMinimized ? 'Expand' : 'Minimize'}
            >
              <svg
                className={`w-5 h-5 transition-transform ${isScoutStatusMinimized ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
          {!isScoutStatusMinimized && (
            <>
              <p className="text-black mb-4 leading-relaxed">
                I would like to apply to become a scout on Got1. I understand this role is for
                individuals that are currently working as a player personnel employee, assistant, or
                intern at a D1-D2 level or a professional level. Other jobs could include directing of
                recruiting, general manager, assistant general manager, etc.
              </p>
              {hasPendingApplication ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-yellow-800">
                    Your scout application is pending review. You will be notified once a decision has
                    been made.
                  </p>
                </div>
              ) : (
                <Link
                  href="/profile/scout-application"
                  className="interactive-press inline-flex items-center justify-center h-10 px-6 rounded-full bg-black text-sm font-semibold text-white hover:bg-gray-900"
                >
                  Apply
                </Link>
              )}
            </>
          )}
        </div>
      )}

      {/* General Info Section */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-black mb-4">General Info</h2>
        <div className="space-y-3 md:space-y-2">
          {/* Help / 1:1 Support with Founder */}
          <div className="flex items-start justify-between gap-3 rounded-2xl bg-white p-4 md:p-4 shadow-sm">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="font-bold text-black mb-1 text-sm md:text-base">Need help?</h3>
              <p className="text-xs md:text-sm text-gray-600 break-words">
                Schedule a 15-minute call with the founder to walk through anything you’re stuck on.
              </p>
            </div>
            <button
              type="button"
              onClick={openCalendly30Min}
              className="interactive-press inline-flex items-center justify-center h-9 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 flex-shrink-0"
            >
              Schedule
            </button>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-2xl bg-white p-4 md:p-4 shadow-sm">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="font-bold text-black mb-1 text-sm md:text-base">Stripe</h3>
              <p className="text-xs md:text-sm text-gray-600 break-words">Update my stripe billing, card info, and more.</p>
            </div>
            <button 
              onClick={handleViewStripeAccount}
              className="interactive-press inline-flex items-center justify-center h-9 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 flex-shrink-0"
            >
              View
            </button>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-2xl bg-white p-4 md:p-4 shadow-sm">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="font-bold text-black mb-1 text-sm md:text-base">Terms of Service</h3>
              <p className="text-xs md:text-sm text-gray-600 break-words">Our Standard on Service</p>
            </div>
            <a
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="interactive-press inline-flex items-center justify-center h-9 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 flex-shrink-0"
            >
              View
            </a>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-2xl bg-white p-4 md:p-4 shadow-sm">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="font-bold text-black mb-1 text-sm md:text-base">Privacy Policy</h3>
              <p className="text-xs md:text-sm text-gray-600 break-words">Our Standard on Privacy</p>
            </div>
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="interactive-press inline-flex items-center justify-center h-9 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 flex-shrink-0"
            >
              View
            </a>
          </div>

          {/* Account Type */}
          <div className="flex items-start justify-between gap-3 rounded-2xl bg-white p-4 md:p-4 shadow-sm">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="font-bold text-black mb-1 text-sm md:text-base">Account Type</h3>
              <p className="text-xs md:text-sm text-gray-600 break-words">
                {profile.role === 'user' ? 'User' : profile.role === 'player' ? 'Player' : 'Scout'}
              </p>
            </div>
            <Link
              href="/profile/account-type"
              className="interactive-press inline-flex items-center justify-center h-9 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 flex-shrink-0"
            >
              View
            </Link>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-2xl bg-white p-4 md:p-4 shadow-sm">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="font-bold text-black mb-1 text-sm md:text-base">Account Ownership</h3>
              <p className="text-xs md:text-sm text-gray-600 break-words">Delete your account or download your data</p>
            </div>
            <Link
              href="/profile/account-ownership"
              className="interactive-press inline-flex items-center justify-center h-9 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 flex-shrink-0"
            >
              View
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-4 md:p-4 shadow-sm flex items-center justify-end">
            <button
              onClick={handleLogout}
              className="interactive-press inline-flex items-center justify-center h-10 px-6 rounded-full border border-red-500 bg-white text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>

      {/* Information Modal */}
      {infoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setInfoModal(null)}>
          <div className="surface-card max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-black">
                {infoModal === 'price' ? 'Price per Evaluation' : 'Turnaround Time'}
              </h3>
              <button
                onClick={() => setInfoModal(null)}
                className="interactive-press text-gray-500 hover:text-black text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="text-black mb-4">
              {infoModal === 'price' ? (
                <p className="leading-relaxed">
                  This is the price players will pay to purchase an evaluation from you. Set this based on your experience level, 
                  the depth of analysis you provide, and the market rate for similar services. Players will see this price when 
                  browsing scouts and will pay this amount when they request an evaluation.
                </p>
              ) : (
                <p className="leading-relaxed">
                  This is the estimated time it takes you to complete and deliver an evaluation after a player purchases one. 
                  Common examples include "24 hrs", "48 hrs", "1 week", etc. This helps players understand when they can expect 
                  to receive their evaluation and sets clear expectations for your service. The default turnaround time is 72 hours.
                </p>
              )}
            </div>
            <button
              onClick={() => setInfoModal(null)}
              className="interactive-press w-full px-6 py-3 rounded-full bg-black text-sm font-semibold text-white hover:bg-gray-900"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

