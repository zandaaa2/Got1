'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { useState, useEffect } from 'react'
import { getGradientForId } from '@/lib/gradients'
import { getProfilePath } from '@/lib/profile-url'
import { isMeaningfulAvatar } from '@/lib/avatar'

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
        throw new Error(data.error || 'Failed to get account link')
      }
      
      if (data.success) {
        if (data.dashboardUrl) {
          console.log('📧 Opening dashboard:', data.dashboardUrl)
          window.open(data.dashboardUrl, '_blank')
        } else if (data.onboardingUrl) {
          // If no dashboard URL but onboarding URL exists, account might need more setup
          console.log('📧 No dashboard URL, but onboarding URL available. Opening onboarding...')
          window.open(data.onboardingUrl, '_blank')
        } else {
          throw new Error('Your Stripe account may need additional verification. Please try again in a few minutes or contact support.')
        }
      } else {
        throw new Error(data.error || 'No dashboard URL available')
      }
    } catch (error: any) {
      console.error('❌ Error getting account link:', error)
      alert(`Failed to access Stripe account: ${error.message || 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePricing = async () => {
    setSaving(true)
    setSaveMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          price_per_eval: pricePerEval ? parseFloat(pricePerEval) : null,
          turnaround_time: turnaroundTime || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id)

      if (updateError) throw updateError

      setSaveMessage('Saved successfully!')
      setIsEditingPricing(false)
      setTimeout(() => setSaveMessage(null), 3000)
      router.refresh()
    } catch (error: any) {
      console.error('Error saving pricing:', error)
      setSaveMessage('Failed to save. Please try again.')
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
    <div className="surface-card mb-8 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-black">Payouts and Turnaround Time</h3>
        <div className="flex gap-2">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="surface-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm text-gray-600">Price per Evaluation</p>
              <button
                onClick={() => setInfoModal('price')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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
                className="text-2xl font-bold text-black border border-gray-300 rounded px-2 py-1 w-full"
                placeholder="99"
              />
            ) : (
              <p className="text-2xl font-bold text-black">${profile.price_per_eval || 99}</p>
            )}
          </div>
          <div className="surface-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm text-gray-600">Turnaround Time</p>
              <button
                onClick={() => setInfoModal('turnaround')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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
                className="text-2xl font-bold text-black border border-gray-300 rounded px-2 py-1 w-full"
                placeholder="72 hrs"
              />
            ) : (
              <p className="text-2xl font-bold text-black">{profile.turnaround_time || '72 hrs'}</p>
            )}
          </div>
        </div>
        {isEditingPricing && (
          <div className="flex gap-2">
            <button
              onClick={handleSavePricing}
              disabled={saving}
              className="interactive-press inline-flex items-center justify-center h-10 px-5 rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="interactive-press inline-flex items-center justify-center h-10 px-5 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
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

  useEffect(() => {
    // Check account status on mount
    checkAccountStatus({ suppressSkeleton: Boolean(globalAccountStatus) })
    
    // Check if returning from Stripe onboarding
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const stripeParam = urlParams.get('stripe')
      
      if (stripeParam === 'success' || stripeParam === 'refresh') {
        // Wait a moment for Stripe to update, then refresh status multiple times
        console.log('📧 Detected return from Stripe onboarding')
        const refreshInterval = setInterval(() => {
          console.log('📧 Refreshing account status after Stripe return (StripeConnectSection)...')
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

  useEffect(() => {
    const sendNotification = async () => {
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
  }, [needsUpdate, notificationSent, accountStatus?.requirementsDue, accountStatus?.requirementsPastDue])

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
        throw new Error(data.error || 'Failed to get account link')
      }
      
      if (data.success) {
        // If onboarding is complete, open dashboard; otherwise open onboarding
        if (data.onboardingComplete && data.dashboardUrl) {
          console.log('📧 Opening dashboard:', data.dashboardUrl)
          window.location.href = data.dashboardUrl
        } else if (data.onboardingUrl) {
          console.log('📧 Opening onboarding:', data.onboardingUrl)
          window.location.href = data.onboardingUrl
        } else {
          console.error('❌ No onboarding or dashboard URL returned')
          alert('Failed to get account link. Please try again.')
        }
      } else {
        throw new Error(data.error || 'Failed to get account link')
      }
    } catch (error: any) {
      console.error('❌ Error getting account link:', error)
      alert(`Failed to access Stripe account: ${error.message || 'Please try again.'}`)
    } finally {
      setLoading(false)
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
                disabled={loading}
                className={`interactive-press inline-flex items-center justify-center h-10 px-5 rounded-full font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed ${needsUpdate ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {loading
                  ? 'Loading...'
                  : needsUpdate
                    ? 'Resolve Stripe Requirements'
                    : accountStatus.onboardingComplete
                      ? 'Open Stripe Dashboard'
                      : 'Finish Stripe Setup'}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                <p>Create your Stripe Connect account so Got1 can pay you after each completed evaluation.</p>
                <p className="mt-2 text-xs text-gray-600">Most scouts finish this step in 3–5 minutes.</p>
              </div>
              <button
                onClick={async () => {
                  setLoading(true)
                  try {
                    const response = await fetch('/api/stripe/connect/create-account', {
                      method: 'POST',
                    })
                    const data = await response.json()
                    
                    if (data.success) {
                      checkAccountStatus()
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
                disabled={loading}
                className="interactive-press inline-flex items-center justify-center h-10 px-5 rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Start Stripe Setup'}
              </button>
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
  const profilePath = getProfilePath(profile.id, profile.username)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://got1.app').replace(/\/$/, '')
  const fullProfileUrl = `${appUrl}${profilePath}`
  const displayProfileUrl = `${appUrl.replace(/^https?:\/\//, '')}${profilePath}`
  const profileGradientKey =
    profile.user_id || profile.id || profile.username || profile.full_name || 'profile'

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

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          price_per_eval: pricePerEval ? parseFloat(pricePerEval) : null,
          turnaround_time: turnaroundTime || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id)

      if (updateError) throw updateError

      setSaveMessage('Saved successfully!')
      setIsEditingPricing(false)
      setTimeout(() => setSaveMessage(null), 3000)
      router.refresh()
    } catch (error: any) {
      console.error('Error saving pricing:', error)
      setSaveMessage('Failed to save. Please try again.')
    } finally {
      setSaving(false)
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

      {/* Scout Status Section - Only show if user is not a scout */}
      {profile.role !== 'scout' && (
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
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <div>
              <h3 className="font-bold text-black mb-1">Stripe</h3>
              <p className="text-sm text-gray-600">Update my stripe billing, card info, and more.</p>
            </div>
            <button className="interactive-press inline-flex items-center justify-center h-9 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
              View
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <div>
              <h3 className="font-bold text-black mb-1">Terms of Service</h3>
              <p className="text-sm text-gray-600">Our Standard on Service</p>
            </div>
            <a
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="interactive-press inline-flex items-center justify-center h-9 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <div>
              <h3 className="font-bold text-black mb-1">Privacy Policy</h3>
              <p className="text-sm text-gray-600">Our Standard on Privacy</p>
            </div>
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="interactive-press inline-flex items-center justify-center h-9 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <div>
              <h3 className="font-bold text-black mb-1">Account Ownership</h3>
              <p className="text-sm text-gray-600">Delete your account or download your data</p>
            </div>
            <Link
              href="/profile/account-ownership"
              className="interactive-press inline-flex items-center justify-center h-9 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm flex items-center justify-end">
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

