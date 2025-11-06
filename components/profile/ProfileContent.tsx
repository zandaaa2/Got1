'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { useState, useEffect } from 'react'

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
} | null = null

/**
 * Money Dashboard Component
 * Shows pricing info and Stripe Connect account access for scouts with completed onboarding
 */
function MoneyDashboard({ profile }: { profile: any }) {
  const [accountStatus, setAccountStatus] = useState(globalAccountStatus)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAccountStatus()
  }, [])

  const checkAccountStatus = async () => {
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
      }
      setAccountStatus(status)
      globalAccountStatus = status
    } catch (error) {
      console.error('Error checking account status:', error)
    }
  }

  const handleGetAccountLink = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/connect/account-link', {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.success && data.dashboardUrl) {
        window.open(data.dashboardUrl, '_blank')
      }
    } catch (error) {
      console.error('Error getting account link:', error)
      alert('Failed to access Stripe account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Only show if account is complete
  if (!accountStatus || !accountStatus.onboardingComplete) {
    return null
  }

  return (
    <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-black">Money Dashboard</h3>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Price per Evaluation</p>
            <p className="text-2xl font-bold text-black">${profile.price_per_eval || 99}</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Turnaround Time</p>
            <p className="text-2xl font-bold text-black">{profile.turnaround_time || '72 hrs'}</p>
          </div>
        </div>
        <button
          onClick={handleGetAccountLink}
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'View my Stripe Connect account'}
        </button>
      </div>
    </div>
  )
}

/**
 * Stripe Connect Section Component
 * Allows scouts to access their Stripe Connect account for payouts
 */
function StripeConnectSection({ profile }: { profile: any }) {
  const [loading, setLoading] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [accountStatus, setAccountStatus] = useState<{
    hasAccount: boolean
    onboardingComplete: boolean
    chargesEnabled: boolean
    payoutsEnabled: boolean
  } | null>(null)

  useEffect(() => {
    // Check account status on mount
    checkAccountStatus()
  }, [])

  const checkAccountStatus = async () => {
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
      }
      setAccountStatus(status)
      globalAccountStatus = status // Update global state
    } catch (error) {
      console.error('Error checking account status:', error)
    }
  }

  const handleGetAccountLink = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/connect/account-link', {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.success) {
        // If onboarding is complete, open dashboard; otherwise open onboarding
        if (accountStatus?.onboardingComplete && data.dashboardUrl) {
          window.open(data.dashboardUrl, '_blank')
        } else if (data.onboardingUrl) {
          window.open(data.onboardingUrl, '_blank')
        }
      }
    } catch (error) {
      console.error('Error getting account link:', error)
      alert('Failed to access Stripe account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-black">Payment Account</h3>
            <button
              type="button"
              onClick={() => setShowInfoModal(true)}
              className="w-5 h-5 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center hover:bg-blue-500 transition-colors font-bold"
              aria-label="Information about Payment Account"
            >
              i
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Manage your payouts and view your earnings
          </p>
        </div>
      </div>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowInfoModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-black">Payment Account</h3>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-gray-500 hover:text-black text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h4 className="font-semibold text-black mb-2">What is a Payment Account?</h4>
                <p className="mb-3">
                  Your Payment Account is a Stripe Connect account that allows you to receive payouts from completed evaluations.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-black mb-2">Stripe Account vs Stripe Connect Account</h4>
                <div className="space-y-2">
                  <div>
                    <p className="font-medium text-black">Stripe Account (Platform Account):</p>
                    <p className="ml-4">• The main Got1 business account</p>
                    <p className="ml-4">• Receives payments from players (money held in escrow)</p>
                    <p className="ml-4">• Manages the platform and takes a 10% fee</p>
                  </div>
                  <div>
                    <p className="font-medium text-black">Stripe Connect Account (Your Scout Account):</p>
                    <p className="ml-4">• Your personal account as a scout</p>
                    <p className="ml-4">• Receives 90% of each evaluation fee when you complete an evaluation</p>
                    <p className="ml-4">• Separate from the platform account for clear tracking</p>
                    <p className="ml-4">• You manage your own payouts and tax information</p>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  <strong>Note:</strong> Even if you own the platform Stripe account, you still need a separate Stripe Connect account to receive scout payouts and track your earnings.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowInfoModal(false)}
              className="mt-4 px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
              Got it
            </button>
          </div>
        </div>
      )}
      
      {!accountStatus ? (
        <div className="text-sm text-gray-600">
          <p>Checking account status...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accountStatus.hasAccount ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${accountStatus.onboardingComplete ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                <span className="text-gray-700">
                  {accountStatus.onboardingComplete 
                    ? 'Account active - Ready to receive payouts' 
                    : 'Onboarding required - Complete setup to receive payouts'}
                </span>
              </div>
              <button
                onClick={handleGetAccountLink}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading 
                  ? 'Loading...' 
                  : accountStatus.onboardingComplete 
                    ? 'Access Dashboard' 
                    : 'Complete Onboarding'}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                <p>Create your Stripe Connect account to start making money providing evaluations.</p>
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
                      alert('Stripe Connect account created! Please refresh the page.')
                      window.location.reload()
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
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Stripe Connect Account'}
              </button>
            </div>
          )}
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

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-8">Profile</h1>

      {/* Profile Card */}
      <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 mb-6 md:mb-8 p-4 md:p-6 bg-white border border-gray-200 rounded-lg">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mx-auto md:mx-0">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name || 'Profile'}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 text-3xl font-semibold">
                {profile.full_name?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-black mb-2">
            {profile.full_name || 'Unknown'}
          </h2>
          {profile.role === 'scout' ? (
            <>
              {profile.position && (
                <p className="text-black mb-1">{profile.position}</p>
              )}
              {profile.organization && (
                <p className="text-black mb-1">{profile.organization}</p>
              )}
            </>
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
          className="px-6 py-3 bg-gray-100 text-black rounded hover:bg-gray-200 font-medium"
        >
          Edit
        </Link>
      </div>

      {/* Stripe Connect Account Section - Only show for scouts */}
      {profile.role === 'scout' && <StripeConnectSection profile={profile} />}

      {/* Money Dashboard - Only show for scouts with completed Stripe Connect account */}
      {profile.role === 'scout' && <MoneyDashboard profile={profile} />}

      {/* Scout Status Section - Only show if user is not a scout */}
      {profile.role !== 'scout' && (
        <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
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
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-800">
                    Your scout application is pending review. You will be notified once a decision has
                    been made.
                  </p>
                </div>
              ) : (
                <Link
                  href="/profile/scout-application"
                  className="inline-block px-6 py-3 bg-black text-white rounded hover:bg-gray-800 font-medium"
                >
                  Apply
                </Link>
              )}
            </>
          )}
        </div>
      )}

      {/* Additional Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-bold text-black mb-1">Stripe</h3>
            <p className="text-sm text-gray-600">Update my stripe billing, card info, and more.</p>
          </div>
          <button className="px-4 py-2 border border-black text-black rounded hover:bg-gray-50">
            View
          </button>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-bold text-black mb-1">Terms of Service</h3>
            <p className="text-sm text-gray-600">Our Standard on Service</p>
          </div>
          <a
            href="/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-black text-black rounded hover:bg-gray-50 inline-block"
          >
            View
          </a>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-bold text-black mb-1">Privacy Policy</h3>
            <p className="text-sm text-gray-600">Our Standard on Privacy</p>
          </div>
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-black text-black rounded hover:bg-gray-50 inline-block"
          >
            View
          </a>
        </div>
      </div>

      {/* Logout Button */}
      <div className="mt-6">
        <button
          onClick={handleLogout}
          className="px-6 py-3 border border-red-600 text-red-600 bg-white rounded hover:bg-red-50 font-medium transition-colors"
        >
          Log Out
        </button>
      </div>

      {/* Information Modal */}
      {infoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setInfoModal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-black">
                {infoModal === 'price' ? 'Price per Evaluation' : 'Turnaround Time'}
              </h3>
              <button
                onClick={() => setInfoModal(null)}
                className="text-gray-500 hover:text-black text-2xl leading-none"
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
              className="w-full px-6 py-2 bg-black text-white rounded hover:bg-gray-800 font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

