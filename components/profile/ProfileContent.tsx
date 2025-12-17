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
import PositionMultiSelect from '@/components/profile/PositionMultiSelect'
import CollegeMultiSelect from '@/components/profile/CollegeMultiSelect'
import { collegeEntries } from '@/lib/college-data'
import ParentDashboard from '@/components/profile/ParentDashboard'
import PendingScoutApplication from '@/components/profile/PendingScoutApplication'

interface ProfileContentProps {
  profile: any
  hasPendingApplication: boolean
  pendingScoutApplication?: any | null
  needsReferrerSelection?: boolean
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
  const [offerTitle, setOfferTitle] = useState(profile.offer_title || 'Standard Evaluation')
  const [offerBio, setOfferBio] = useState(profile.bio || '')
  const [pricePerEval, setPricePerEval] = useState(profile.price_per_eval?.toString() || '99')
  const [turnaroundTime, setTurnaroundTime] = useState(profile.turnaround_time || '72 hrs')
  const [freeEvalEnabled, setFreeEvalEnabled] = useState(profile.free_eval_enabled || false)
  const [freeEvalDescription, setFreeEvalDescription] = useState(profile.free_eval_description || '')
  const [isEditingFreeEval, setIsEditingFreeEval] = useState(false)
  // For positions and college connections - temporarily stored as JSONB in profile
  // Later this will be stored per-offer in scout_offers table
  const [selectedPositions, setSelectedPositions] = useState<string[]>(() => {
    try {
      if (profile.positions && typeof profile.positions === 'string') {
        return JSON.parse(profile.positions)
      } else if (Array.isArray(profile.positions)) {
        return profile.positions
      }
      return []
    } catch {
      return []
    }
  })
  const [selectedCollegeSlugs, setSelectedCollegeSlugs] = useState<string[]>(() => {
    try {
      if (profile.college_connections && typeof profile.college_connections === 'string') {
        return JSON.parse(profile.college_connections)
      } else if (Array.isArray(profile.college_connections)) {
        return profile.college_connections
      }
      return []
    } catch {
      return []
    }
  })
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [infoModal, setInfoModal] = useState<'price' | 'turnaround' | null>(null)
  const [isBioExpanded, setIsBioExpanded] = useState(false)
  const [isFreeEvalBioExpanded, setIsFreeEvalBioExpanded] = useState(false)
  
  // Truncate bio if longer than 100 characters
  const shouldTruncateBio = offerBio && offerBio.length > 100 && !isEditingPricing
  const displayBio = shouldTruncateBio && !isBioExpanded 
    ? offerBio.substring(0, 100) + '...' 
    : offerBio
  
  // Truncate free eval description if longer than 100 characters
  const shouldTruncateFreeEvalBio = freeEvalDescription && freeEvalDescription.length > 100 && !isEditingFreeEval
  const displayFreeEvalBio = shouldTruncateFreeEvalBio && !isFreeEvalBioExpanded
    ? freeEvalDescription.substring(0, 100) + '...'
    : freeEvalDescription

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
    setOfferBio(profile.bio || '')
    setIsBioExpanded(false) // Reset bio expansion when profile updates
  }, [profile.price_per_eval, profile.turnaround_time, profile.bio])

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

      // Validate free eval description if enabled
      if (freeEvalEnabled && freeEvalDescription.trim().length < 250) {
        throw new Error('Free eval description must be at least 250 characters')
      }

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          price_per_eval: price,
          turnaround_time: turnaroundTime || null,
          bio: offerBio || null, // Save bio (for now, later it will be per-offer)
          offer_title: offerTitle || 'Standard Evaluation',
          positions: selectedPositions.length > 0 ? JSON.stringify(selectedPositions) : null,
          college_connections: selectedCollegeSlugs.length > 0 ? JSON.stringify(selectedCollegeSlugs) : null,
          free_eval_enabled: freeEvalEnabled,
          free_eval_description: freeEvalEnabled ? freeEvalDescription.trim() : null,
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
      setOfferBio(data[0].bio || '')
      setOfferTitle(data[0].offer_title || 'Standard Evaluation')
      
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
        <h3 className="text-lg md:text-xl font-bold text-black">Evaluation Info</h3>
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
      <div className="space-y-3 md:space-y-4">
        {/* Free Eval Enable Checkbox - Above cards */}
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={freeEvalEnabled}
              onChange={(e) => setFreeEvalEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm md:text-base text-gray-700 font-medium">Enable free evaluation offer</span>
          </label>
        </div>

        {/* Offer cards - grid layout for multiple offers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {/* Free Eval Offer Card - positioned first (left) */}
          <div className={`surface-card p-3 md:p-4 border border-gray-200 rounded-lg relative ${!freeEvalEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                {isEditingFreeEval ? (
                  <input
                    type="text"
                    value="Free Evaluation"
                    readOnly
                    className="text-base md:text-lg font-bold text-black border border-gray-300 rounded px-2 py-1.5 w-full mb-2"
                  />
                ) : (
                  <h4 className="text-base md:text-lg font-bold text-black mb-1.5">
                    Free Evaluation
                  </h4>
                )}
                {isEditingFreeEval ? (
                  <textarea
                    value={freeEvalDescription}
                    onChange={(e) => setFreeEvalDescription(e.target.value)}
                    className="text-xs md:text-sm text-gray-600 border border-gray-300 rounded px-2 py-1.5 w-full min-h-[70px] resize-y"
                    placeholder="Describe what players will get with this evaluation..."
                  />
                ) : (
                  <div>
                    {displayFreeEvalBio ? (
                      <p className="text-xs md:text-sm text-gray-600 mb-0">
                        {displayFreeEvalBio}
                        {shouldTruncateFreeEvalBio && (
                          <button
                            onClick={() => setIsFreeEvalBioExpanded(!isFreeEvalBioExpanded)}
                            className="ml-1 text-blue-600 hover:text-blue-700 underline"
                          >
                            {isFreeEvalBioExpanded ? 'Show less' : 'Show more'}
                          </button>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs md:text-sm text-gray-400 italic">No description provided.</p>
                    )}
                  </div>
                )}
              </div>
              {!isEditingFreeEval && freeEvalEnabled && (
                <button
                  onClick={() => setIsEditingFreeEval(true)}
                  className="text-gray-400 hover:text-gray-600 transition-colors ml-2 flex-shrink-0"
                  title="Edit free eval offer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Price and Turnaround in a row */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-xs text-gray-600">Price</p>
                </div>
                <p className="text-base md:text-lg font-bold text-black">$0</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-xs text-gray-600">Turnaround</p>
                </div>
                <p className="text-base md:text-lg font-bold text-black">{profile.turnaround_time || '72 hrs'}</p>
              </div>
            </div>

            {/* Positions and College Connections */}
            <div className="pt-3 border-t border-gray-200 space-y-3">
              {isEditingFreeEval ? (
                <>
                  <PositionMultiSelect
                    selectedPositions={selectedPositions}
                    onChange={setSelectedPositions}
                    label="Position(s)"
                    disabled={false}
                  />
                  <CollegeMultiSelect
                    selectedColleges={selectedCollegeSlugs}
                    onChange={setSelectedCollegeSlugs}
                    label="College Connections"
                    disabled={false}
                    maxSelections={7}
                  />
                  <div className="flex items-center justify-between pt-2">
                    <p className={`text-xs ${freeEvalDescription.length < 250 ? 'text-red-600' : 'text-gray-600'}`}>
                      {freeEvalDescription.length} / 250 characters minimum
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsEditingFreeEval(false)
                          setFreeEvalDescription(profile.free_eval_description || '')
                        }}
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (freeEvalDescription.trim().length < 250) {
                            alert('Description must be at least 250 characters')
                            return
                          }
                          await handleSavePricing()
                          setIsEditingFreeEval(false)
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  {/* Display Positions */}
                  <div>
                    <p className="text-xs text-gray-600 mb-1.5 font-medium">Positions:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPositions.length > 0 ? (
                        selectedPositions.map((pos) => (
                          <span
                            key={pos}
                            className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium"
                          >
                            {pos}
                          </span>
                        ))
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                          All positions
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Display College Connections */}
                  {selectedCollegeSlugs.length > 0 ? (
                    <div>
                      <p className="text-xs text-gray-600 mb-1.5 font-medium">Connections:</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedCollegeSlugs.slice(0, 5).map((slug) => {
                          const college = collegeEntries.find((c) => c.slug === slug)
                          if (!college) return null
                          return (
                            <div
                              key={slug}
                              className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md border border-gray-200"
                            >
                              {college.logo && (
                                <Image
                                  src={college.logo}
                                  alt={college.name}
                                  width={20}
                                  height={20}
                                  className="object-contain"
                                  unoptimized
                                />
                              )}
                              <span className="text-xs text-gray-700">{college.name}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No college connections specified</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Paid offer card - compact version */}
          <div className="surface-card p-3 md:p-4 border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                {isEditingPricing ? (
                  <input
                    type="text"
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                    className="text-base md:text-lg font-bold text-black border border-gray-300 rounded px-2 py-1.5 w-full mb-2"
                    placeholder="Standard Evaluation"
                  />
                ) : (
                  <h4 className="text-base md:text-lg font-bold text-black mb-1.5">
                    {offerTitle}
                  </h4>
                )}
                {isEditingPricing ? (
                  <textarea
                    value={offerBio}
                    onChange={(e) => setOfferBio(e.target.value)}
                    className="text-xs md:text-sm text-gray-600 border border-gray-300 rounded px-2 py-1.5 w-full min-h-[70px] resize-y"
                    placeholder="Describe what players will get with this evaluation..."
                  />
                ) : (
                  <div>
                    {displayBio ? (
                      <p className="text-xs md:text-sm text-gray-600 mb-0">
                        {displayBio}
                        {shouldTruncateBio && (
                          <button
                            onClick={() => setIsBioExpanded(!isBioExpanded)}
                            className="ml-1 text-blue-600 hover:text-blue-700 underline"
                          >
                            {isBioExpanded ? 'Show less' : 'Show more'}
                          </button>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs md:text-sm text-gray-400 italic">No description provided.</p>
                    )}
                  </div>
                )}
              </div>
              {!isEditingPricing && (
                <button
                  onClick={() => setIsEditingPricing(true)}
                  className="text-gray-400 hover:text-gray-600 transition-colors ml-2 flex-shrink-0"
                  title="Edit offer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Price and Turnaround in a row */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-xs text-gray-600">Price</p>
                  <button
                    onClick={() => setInfoModal('price')}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                    title="More information"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                {isEditingPricing ? (
                  <input
                    type="number"
                    value={pricePerEval}
                    onChange={(e) => setPricePerEval(e.target.value)}
                    className="text-base md:text-lg font-bold text-black border border-gray-300 rounded px-2 py-1 w-full"
                    placeholder="99"
                  />
                ) : (
                  <p className="text-base md:text-lg font-bold text-black">${profile.price_per_eval || 99}</p>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-xs text-gray-600">Turnaround</p>
                  <button
                    onClick={() => setInfoModal('turnaround')}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                    title="More information"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                {isEditingPricing ? (
                  <input
                    type="text"
                    value={turnaroundTime}
                    onChange={(e) => setTurnaroundTime(e.target.value)}
                    className="text-base md:text-lg font-bold text-black border border-gray-300 rounded px-2 py-1 w-full"
                    placeholder="72 hrs"
                  />
                ) : (
                  <p className="text-base md:text-lg font-bold text-black">{profile.turnaround_time || '72 hrs'}</p>
                )}
              </div>
            </div>

            {/* Positions and College Connections */}
            <div className="pt-3 border-t border-gray-200 space-y-3">
              {isEditingPricing ? (
                <>
                  <PositionMultiSelect
                    selectedPositions={selectedPositions}
                    onChange={setSelectedPositions}
                    label="Position(s)"
                    disabled={false}
                  />
                  <CollegeMultiSelect
                    selectedColleges={selectedCollegeSlugs}
                    onChange={setSelectedCollegeSlugs}
                    label="College Connections"
                    disabled={false}
                    maxSelections={7}
                  />
                </>
                ) : (
                <div className="space-y-2">
                  {/* Display Positions */}
                  <div>
                    <p className="text-xs text-gray-600 mb-1.5 font-medium">Positions:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPositions.length > 0 ? (
                        selectedPositions.map((pos) => (
                          <span
                            key={pos}
                            className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium"
                          >
                            {pos}
                          </span>
                        ))
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                          All positions
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Display College Connections */}
                  {selectedCollegeSlugs.length > 0 ? (
                    <div>
                      <p className="text-xs text-gray-600 mb-1.5 font-medium">Connections:</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedCollegeSlugs.slice(0, 5).map((slug) => {
                          const college = collegeEntries.find((c) => c.slug === slug)
                          if (!college) return null
                          return (
                            <div
                              key={slug}
                              className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md border border-gray-200"
                            >
                              {college.logo && (
                                <Image
                                  src={college.logo}
                                  alt={college.name}
                                  width={20}
                                  height={20}
                                  className="object-contain"
                                  unoptimized
                                />
                              )}
                              <span className="text-xs text-gray-700">{college.name}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No college connections specified</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Offer button - disabled for now */}
        <button
          disabled
          className="w-full py-3 px-4 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
          title="Coming soon: Add multiple offers"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium">Add Offer</span>
        </button>
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
                setOfferBio(profile.bio || '')
                setOfferTitle(profile.offer_title || 'Standard Evaluation')
                setIsBioExpanded(false)
                setSaveMessage(null)
                // Reset positions and colleges to saved values
                try {
                  if (profile.positions && typeof profile.positions === 'string') {
                    setSelectedPositions(JSON.parse(profile.positions))
                  } else if (Array.isArray(profile.positions)) {
                    setSelectedPositions(profile.positions)
                  } else {
                    setSelectedPositions([])
                  }
                } catch {
                  setSelectedPositions([])
                }
                try {
                  if (profile.college_connections && typeof profile.college_connections === 'string') {
                    setSelectedCollegeSlugs(JSON.parse(profile.college_connections))
                  } else if (Array.isArray(profile.college_connections)) {
                    setSelectedCollegeSlugs(profile.college_connections)
                  } else {
                    setSelectedCollegeSlugs([])
                  }
                } catch {
                  setSelectedCollegeSlugs([])
                }
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
function ScoutSetupProgress({ profile }: { profile: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [referrerSelected, setReferrerSelected] = useState(false)
  const [needsReferrerSelection, setNeedsReferrerSelection] = useState(false)
  const [stripeStarted, setStripeStarted] = useState(false)
  const [stripeComplete, setStripeComplete] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkProgress = async () => {
      setLoading(true)
      // Small delay to ensure any previous writes are committed
      await new Promise(resolve => setTimeout(resolve, 100))
      try {
        // Check if user has skipped referrer selection (persisted in localStorage)
        const skipKey = `scout-referrer-skipped-${profile.user_id}`
        const hasSkippedReferrer = typeof window !== 'undefined' && localStorage.getItem(skipKey) === 'true'
        
        // Step 1: Check if referrer has been selected
        // Use API endpoint as fallback since RLS might be blocking direct queries
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        const sessionUserId = currentSession?.user?.id
        const profileUserId = profile.user_id
        
        let referral = null
        let hasReferrer = false
        
        // First try direct query (faster if RLS allows it)
        // Use .limit(1) to get the first referral if duplicates exist
        if (sessionUserId) {
          const result = await supabase
            .from('referrals')
            .select('id, referrer_id, referred_id, created_at')
            .eq('referred_id', sessionUserId)
            .limit(1)
            .maybeSingle()
          
          if (result.data) {
            referral = result.data
            hasReferrer = true
          } else if (result.error) {
            console.warn('Direct query failed, trying API endpoint:', result.error)
          }
        }
        
        // If direct query didn't work, try API endpoint (bypasses RLS)
        if (!hasReferrer) {
          try {
            const checkResponse = await fetch(`/api/referrals/check?t=${Date.now()}`, {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache',
              },
            })
            
            if (checkResponse.ok) {
              const checkData = await checkResponse.json()
              hasReferrer = checkData.hasReferral === true
              referral = checkData.referral || null
              
              console.log('✅ API check result:', {
                hasReferral: checkData.hasReferral,
                referral: referral ? { id: referral.id } : null,
              })
            } else {
              console.warn('API check failed:', checkResponse.status)
            }
          } catch (apiError) {
            console.warn('API check error:', apiError)
          }
        }
        
        console.log('🔍 Final referral check result:', {
          sessionUserId,
          profileUserId,
          referral: referral ? { id: referral.id, referrerId: referral.referrer_id, referredId: referral.referred_id } : null,
          hasReferral: hasReferrer,
        })
        
        if (hasReferrer) {
          console.log('✅ Referral found - setting referrerSelected to TRUE')
          setReferrerSelected(true)
        } else {
          console.log('⚠️ No referral found')
          setReferrerSelected(false)
        }

        // Check if they need to select a referrer
        // If they've skipped before, don't require it again
        if (hasReferrer) {
          // If referral exists, don't show referrer selection
          console.log('✅ Referral exists - hiding referrer selection screen')
          setNeedsReferrerSelection(false)
        } else if (hasSkippedReferrer) {
          // User has skipped referrer selection before - don't require it
          console.log('✅ User has skipped referrer selection - not requiring it')
          setNeedsReferrerSelection(false)
        } else {
          // Default to true - new scouts need to select a referrer
          // Will be set to false if they have Stripe started (existing scout)
          setNeedsReferrerSelection(true)
          console.log('📋 No referrer found - defaulting to requiring referrer selection (will check Stripe status)')
        }

        // Step 2 & 3: Check Stripe account status
        try {
          const response = await fetch('/api/stripe/connect/account-link', {
            method: 'GET',
            cache: 'no-store', // Prevent caching to get fresh data
          })
          
          if (!response.ok) {
            console.error('❌ Stripe API error:', response.status, response.statusText)
            setStripeStarted(false)
            setStripeComplete(false)
            // If Stripe check fails, assume they don't have Stripe (new scout)
            // needsReferrerSelection should already be true if no referrer was found
            return
          }
          
          const data = await response.json()
          
          console.log('🔍 Stripe API Response:', {
            hasAccount: data.hasAccount,
            onboardingComplete: data.onboardingComplete,
            chargesEnabled: data.chargesEnabled,
            payoutsEnabled: data.payoutsEnabled,
            detailsSubmitted: data.detailsSubmitted,
            fullResponse: data,
          })
          
          const hasStripeAccount = data.hasAccount || false
          // Step 2 is only complete if they've actually started onboarding (detailsSubmitted)
          // Just having an account (auto-created) doesn't count as "started"
          // This ensures progress bar starts at 0 for new scouts
          const hasStartedOnboarding = hasStripeAccount && (data.detailsSubmitted || data.onboardingComplete)
          setStripeStarted(hasStartedOnboarding)
          
          // Update referrer selection requirement based on Stripe status
          // IMPORTANT: Even if they have a Stripe account (auto-created on approval),
          // they still need to select a referrer if they haven't already (unless they've skipped)
          // Only skip referrer selection if they have:
          // 1. A referrer selected, OR
          // 2. Skipped referrer selection (persisted), OR
          // 3. Stripe account AND onboarding complete (existing scout who's been through the flow)
          if (!referrerSelected && !hasSkippedReferrer) {
            // No referrer selected and hasn't skipped - check if they're an existing scout with completed Stripe
            const isExistingScout = hasStripeAccount && data.onboardingComplete
            if (isExistingScout) {
              // Existing scout with completed Stripe - don't require referrer selection
              setNeedsReferrerSelection(false)
              console.log('📋 Existing scout with completed Stripe - referrer selection not required')
            } else {
              // New scout (even with Stripe account created) - must select referrer first
              setNeedsReferrerSelection(true)
              console.log('📋 New scout - requiring referrer selection (Stripe account exists but onboarding not complete)')
            }
          } else if (hasSkippedReferrer) {
            // User has skipped - don't require selection
            setNeedsReferrerSelection(false)
            console.log('📋 User has skipped referrer selection - not requiring it')
          } else {
            // Referrer already selected - don't require selection
            setNeedsReferrerSelection(false)
            console.log('📋 Referrer already selected - not requiring referrer selection')
          }
          
          // Stripe is complete if onboarding is complete (which means account can receive payments)
          // We don't require both chargesEnabled AND payoutsEnabled because:
          // - Payouts can take 1-2 business days to enable after onboarding
          // - Express accounts can have details_submitted = true but charges not yet enabled
          // - If onboardingComplete = true, the account is functional for receiving payments
          const isComplete = hasStripeAccount && data.onboardingComplete
          console.log('🔍 Stripe Complete Calculation:', {
            hasAccount: data.hasAccount,
            onboardingComplete: data.onboardingComplete,
            isComplete,
            willSetComplete: isComplete,
          })
          setStripeComplete(isComplete)
        } catch (fetchError) {
          console.error('❌ Error fetching Stripe status:', fetchError)
          setStripeStarted(false)
          setStripeComplete(false)
        }
      } catch (error) {
        console.error('Error checking setup progress:', error)
      } finally {
        setLoading(false)
      }
    }

    checkProgress()
  }, [profile.user_id]) // Removed supabase from deps as it's stable

  const handleStartStripe = async () => {
    try {
      // Check if account exists first
      const response = await fetch('/api/stripe/connect/account-link', {
        method: 'GET',
      })
      const data = await response.json()

      if (!data.hasAccount) {
        // Create account first
        const createResponse = await fetch('/api/stripe/connect/create-account', {
          method: 'POST',
        })
        const createData = await createResponse.json()
        
        if (!createResponse.ok) {
          const errorMsg = createData.error || 'Failed to create Stripe account'
          const details = createData.details ? ` (${createData.details})` : ''
          throw new Error(`${errorMsg}${details}`)
        }
      }

      // Get account link
      const linkResponse = await fetch('/api/stripe/connect/account-link', {
        method: 'GET',
      })
      const linkData = await linkResponse.json()

      if (linkData.url) {
        window.location.href = linkData.url
      } else {
        throw new Error('No account link available')
      }
    } catch (error: any) {
      console.error('Error starting Stripe setup:', error)
      alert(`Failed to start Stripe setup: ${error.message || 'Please try again.'}`)
    }
  }

  const handleCompleteStripe = async () => {
    try {
      const response = await fetch('/api/stripe/connect/account-link', {
        method: 'GET',
      })
      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No account link available')
      }
    } catch (error: any) {
      console.error('Error accessing Stripe account:', error)
      alert(`Failed to access Stripe account: ${error.message || 'Please try again.'}`)
    }
  }

  if (loading) {
    return (
      <div className="mb-6 md:mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  // Debug: Log current state values
  console.log('🔍 Scout Setup Progress State:', {
    referrerSelected,
    stripeStarted,
    stripeComplete,
    needsReferrerSelection,
    profileUserId: profile.user_id,
  })

  // The 3 steps are:
  // Step 1: Select Referrer (complete if selected or skipped)
  // Step 2: Start Stripe Setup (complete if onboarding has started - detailsSubmitted)
  // Step 3: Complete Stripe Setup (complete if onboarding is complete)
  
  // Step 1 is complete if:
  // 1. They already selected a referrer, OR
  // 2. They don't need to select a referrer (existing scout or skipped)
  const referrerStepComplete = referrerSelected || !needsReferrerSelection
  
  // Step 2 is complete if they've started Stripe onboarding (detailsSubmitted)
  // Just having an account (auto-created) doesn't count - they need to actually start onboarding
  // Step 3 is complete if onboarding is fully complete
  
  const completedSteps = [referrerStepComplete, stripeStarted, stripeComplete].filter(Boolean).length
  const progressPercent = (completedSteps / 3) * 100

  console.log('📊 Progress calculation:', {
    referrerStepComplete,
    referrerSelected,
    needsReferrerSelection,
    stripeStarted,
    stripeComplete,
    completedSteps,
    progressPercent,
    willShowReferrerSelection: !referrerSelected && needsReferrerSelection,
  })

  // Determine current step
  // Step 1: Select Referrer (if needed and not selected)
  // Step 2: Start Stripe Setup (if step 1 done but Stripe not started)
  // Step 3: Complete Stripe Setup (if step 2 done but not complete)
  let currentStep = null
  if (!referrerSelected && needsReferrerSelection) {
    currentStep = 'referrer' // Step 1
  } else if (!stripeStarted) {
    currentStep = 'start-stripe' // Step 2: Start Stripe Setup
  } else if (!stripeComplete) {
    currentStep = 'complete-stripe' // Step 3: Complete Stripe Setup
  }

  // If all steps are complete, don't show the section
  if (completedSteps === 3) {
    return null
  }

  return (
    <div className="mb-6 md:mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-black mb-2">Scout Setup Progress</h2>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-black h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600">
          {completedSteps} of 3 steps completed
        </p>
      </div>

      {/* Current Action */}
      {currentStep === 'referrer' && (
        <ReferrerSelectionInline 
          profile={profile}
          onComplete={() => {
            // Mark referrer step as complete (either selected or skipped)
            // Persist skip state in localStorage to prevent glitch on reload
            const skipKey = `scout-referrer-skipped-${profile.user_id}`
            localStorage.setItem(skipKey, 'true')
            setNeedsReferrerSelection(false)
            // Force full page reload to ensure state updates correctly
            window.location.reload()
          }}
        />
      )}

      {currentStep === 'start-stripe' && (
        <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
          <h3 className="font-semibold text-black mb-2">Start Stripe Setup</h3>
          <p className="text-sm text-gray-600 mb-4">
            Create your Stripe Connect account to receive payments for evaluations.
          </p>
          <button
            onClick={handleStartStripe}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-medium"
          >
            Start Stripe Setup
          </button>
        </div>
      )}

      {currentStep === 'complete-stripe' && (
        <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
          <h3 className="font-semibold text-black mb-2">Complete Stripe Setup</h3>
          <p className="text-sm text-gray-600 mb-4">
            Finish setting up your Stripe account to enable payments.
          </p>
          <button
            onClick={handleCompleteStripe}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-medium"
          >
            Complete Stripe Setup
          </button>
        </div>
      )}
    </div>
  )
}

function ReferrerSelectionInline({ profile, onComplete }: { profile: any; onComplete: () => void }) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [approvedReferrers, setApprovedReferrers] = useState<any[]>([])
  const [selectedReferrerId, setSelectedReferrerId] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    const loadApprovedReferrers = async () => {
      try {
        const { data: applications, error: appsError } = await supabase
          .from('referral_program_applications')
          .select('user_id, status')
          .eq('status', 'approved')

        if (appsError) {
          console.error('Error fetching referral applications:', appsError)
          setLoading(false)
          return
        }

        if (!applications || applications.length === 0) {
          console.log('No approved referral applications found')
          setLoading(false)
          return
        }

        console.log('Found approved referral applications:', applications.length)
        const referrerIds = applications.map(app => app.user_id)

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, position, organization')
          .in('user_id', referrerIds)

        if (profilesError) {
          console.error('Error fetching referrer profiles:', profilesError)
          setLoading(false)
          return
        }

        console.log('Loaded referrer profiles:', profiles?.length || 0)
        setApprovedReferrers(profiles || [])
      } catch (error) {
        console.error('Error loading referrers:', error)
      } finally {
        setLoading(false)
      }
    }

    loadApprovedReferrers()
  }, [supabase])

  const handleSubmit = async () => {
    if (!selectedReferrerId) {
      alert('Please select a referrer')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/referrals/select-referrer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referrer_id: selectedReferrerId,
          referred_role: 'scout',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // If referral already exists, refresh to check status
        if (data.error?.includes('already') || data.error?.includes('Referral already exists')) {
          alert('You already have a referrer selected. Refreshing page...')
          window.location.reload()
          return
        }
        throw new Error(data.error || 'Failed to select referrer')
      }

      // Verify the referral was actually created before proceeding
      console.log('✅ Referral created successfully:', data.referral?.id)
      
      // Small delay to ensure database write is complete, then reload
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error: any) {
      console.error('Error selecting referrer:', error)
      alert(error.message || 'Failed to select referrer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = async () => {
    onComplete()
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-black mb-2">Select Your Referrer</h3>
      <p className="text-sm text-gray-600 mb-6">
        Who referred you to Got1? This helps us track referrals and reward those who bring new scouts to the platform.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      ) : approvedReferrers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No referrers available.</p>
          <button
            onClick={handleSkip}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-medium"
          >
            Skip This Step
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
            {approvedReferrers.map((referrer) => {
              const avatarUrl = referrer.avatar_url && isMeaningfulAvatar(referrer.avatar_url)
                ? referrer.avatar_url
                : null
              const initial = (referrer.full_name || '?').charAt(0).toUpperCase()
              const gradientKey = referrer.user_id
              const positionOrg = referrer.position && referrer.organization
                ? `${referrer.position} at ${referrer.organization}`
                : referrer.position || referrer.organization || null

              return (
                <button
                  key={referrer.user_id}
                  onClick={() => setSelectedReferrerId(referrer.user_id)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedReferrerId === referrer.user_id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {avatarUrl && !imageErrors.has(referrer.user_id) ? (
                      <Image
                        src={avatarUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="rounded-full object-cover flex-shrink-0"
                        onError={() => setImageErrors(prev => new Set(prev).add(referrer.user_id))}
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${getGradientForId(gradientKey)}`}>
                        {initial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-black mb-1">{referrer.full_name || 'Unknown'}</p>
                      {positionOrg && (
                        <p className="text-sm text-gray-600">{positionOrg}</p>
                      )}
                    </div>
                    {selectedReferrerId === referrer.user_id && (
                      <div className="flex-shrink-0">
                        <svg
                          className="w-6 h-6 text-black"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSkip}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedReferrerId || submitting}
              className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? 'Submitting...' : 'Continue'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

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
              link: '/discover',
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

export default function ProfileContent({ profile, hasPendingApplication, pendingScoutApplication, needsReferrerSelection = false }: ProfileContentProps) {
  const [isScoutStatusMinimized, setIsScoutStatusMinimized] = useState(false)
  const [activeTab, setActiveTab] = useState<'offers' | 'posts'>('offers')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    console.log('ProfileContent mounted', { profileId: profile?.id, role: profile?.role })
  }, [profile])

  // Handle PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Save the event so it can be triggered later
      setDeferredPrompt(e)
      setShowInstallButton(true)
    }

    const handleAppInstalled = () => {
      // Hide the install button after app is installed
      setShowInstallButton(false)
      setDeferredPrompt(null)
    }

    // Check if app is already installed (standalone mode)
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOSStandalone = (window.navigator as any).standalone === true
      
      if (!isStandalone && !isIOSStandalone) {
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.removeEventListener('appinstalled', handleAppInstalled)
      }
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return
    }

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the deferredPrompt so it can only be used once
    setDeferredPrompt(null)
    setShowInstallButton(false)
  }
  
  // Early return if profile is missing
  if (!profile) {
    console.error('ProfileContent: No profile provided')
    return (
      <div className="p-8">
        <p className="text-red-600">Error: Profile not found</p>
      </div>
    )
  }
  const [pricePerEval, setPricePerEval] = useState(profile.price_per_eval?.toString() || '99')
  const [turnaroundTime, setTurnaroundTime] = useState(profile.turnaround_time || '72 hrs')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [isEditingPricing, setIsEditingPricing] = useState(false)
  const [infoModal, setInfoModal] = useState<'price' | 'turnaround' | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [userEmail, setUserEmail] = useState<string | null>(null)
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
  
  // Helper function to parse positions from profile
  const getDisplayPositions = () => {
    try {
      if (profile.positions && typeof profile.positions === 'string') {
        const parsed = JSON.parse(profile.positions)
        return Array.isArray(parsed) ? parsed : []
      } else if (Array.isArray(profile.positions)) {
        return profile.positions
      }
      return profile.position ? [profile.position] : []
    } catch {
      return profile.position ? [profile.position] : []
    }
  }

  // Helper function to get HUDL links
  const getDisplayHudlLinks = () => {
    if (profile.hudl_links && Array.isArray(profile.hudl_links) && profile.hudl_links.length > 0) {
      return profile.hudl_links.map((hl: any) => ({
        link: hl.link || hl.url || hl,
        sport: hl.sport || ''
      }))
    }
    if (profile.hudl_link) {
      return [{ link: profile.hudl_link, sport: '' }]
    }
    return []
  }

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

  // Get user email for admin check
  useEffect(() => {
    const getUserEmail = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.email) {
          setUserEmail(session.user.email)
        }
      } catch (error) {
        console.error('Error getting user email:', error)
      }
    }
    getUserEmail()
  }, [supabase])

  /**
   * Handles user logout by signing out from Supabase and redirecting to welcome page.
   *
   * @returns {Promise<void>}
   */
  const handleLogout = async () => {
    try {
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
    <div className="mt-1 md:mt-2 flex flex-wrap items-center gap-1.5 md:gap-2 text-xs md:text-sm">
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
        className="interactive-press inline-flex items-center gap-0.5 md:gap-1 rounded-full border border-gray-300 px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-medium text-gray-700 hover:bg-gray-50"
        aria-live="polite"
        aria-label="Copy profile link"
      >
        <svg
          className="h-3 w-3 md:h-3.5 md:w-3.5"
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
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-black">Profile</h1>
        {/* Mobile action buttons */}
        <div className="md:hidden flex items-center gap-2">
          {/* Install button for mobile */}
          {showInstallButton && (
            <button
              onClick={handleInstallClick}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Install App"
              title="Install Got1 App"
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>
          )}
          {/* Settings icon for mobile */}
          <Link
            href="/settings"
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Settings"
          >
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* Profile Card */}
      <div className="surface-card flex flex-row flex-wrap md:flex-nowrap items-start gap-3 md:gap-6 mb-6 md:mb-8 p-3 md:p-6">
        <div className="w-14 h-14 md:w-24 md:h-24 rounded-full overflow-hidden flex-shrink-0 mx-auto md:mx-0">
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
              <span className="text-white text-xl md:text-3xl font-semibold">
                {profile.full_name?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-xs md:text-sm text-gray-500 mb-1 md:mb-1.5 font-medium uppercase tracking-wide">
            {profile.role === 'user' ? 'User' 
             : profile.role === 'player' ? 'Player' 
             : profile.role === 'parent' ? 'Parent'
             : profile.role === 'scout' ? 'Scout'
             : 'User'}
          </div>
          <h2 className="text-base md:text-xl font-bold text-black mb-0.5 md:mb-1">
            {profile.full_name || 'Unknown'}
          </h2>
          <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">
            {profile.username && <span className="text-gray-500">@{profile.username}</span>}
          </div>
          {profileLinkElement}
          {profile.role === 'scout' ? (
            (profile.position || profile.organization) && (
              <p className="text-xs md:text-base text-black mb-0.5 md:mb-1">
                {profile.position && profile.organization
                  ? `${profile.position} at ${profile.organization}`
                  : profile.position || profile.organization}
              </p>
            )
          ) : (
            <>
              {profile.position && (
                <p className="text-xs md:text-base text-black mb-0.5 md:mb-1">{profile.position}</p>
              )}
              {profile.school && (
                <p className="text-xs md:text-base text-black mb-0.5 md:mb-1">
                  {profile.school}
                  {profile.graduation_year && `, ${profile.graduation_year}`}
                </p>
              )}
            </>
          )}
        </div>
        <Link
          href="/profile/edit"
          className="interactive-press inline-flex items-center justify-center h-8 md:h-10 px-3 md:px-5 rounded-full border border-gray-200 bg-white text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 w-full md:w-auto"
        >
          Edit
        </Link>
      </div>

      {/* Tabs - Only show for scouts */}
      {profile.role === 'scout' && (
        <div className="mb-6 md:mb-8">
          <div className="flex gap-2 md:gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('offers')}
              className={`interactive-press px-3 md:px-4 py-2 font-medium text-sm md:text-base transition-colors ${
                activeTab === 'offers'
                  ? 'bg-gray-100 border-b-2 border-black text-black'
                  : 'text-black hover:bg-gray-50'
              }`}
            >
              Eval Offers
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`interactive-press px-3 md:px-4 py-2 font-medium text-sm md:text-base transition-colors ${
                activeTab === 'posts'
                  ? 'bg-gray-100 border-b-2 border-black text-black'
                  : 'text-black hover:bg-gray-50'
              }`}
            >
              Posts
            </button>
          </div>
        </div>
      )}

      {/* Scout Setup Progress - Only show for scouts */}
      {profile.role === 'scout' && <ScoutSetupProgress key={`setup-${refreshKey}`} profile={profile} />}

      {/* Tab Content - Only show for scouts */}
      {profile.role === 'scout' && (
        <div className="mb-6 md:mb-8">
          {activeTab === 'offers' && (
            <div>
              {/* Money Dashboard - Only show for scouts with completed Stripe Connect account */}
              <MoneyDashboard key={`money-${refreshKey}`} profile={profile} />
            </div>
          )}
          {activeTab === 'posts' && (
            <div className="text-center py-12 text-gray-500">
              Posts coming soon
            </div>
          )}
        </div>
      )}


      {/* Parent Dashboard - Only show for parents */}
      {profile.role === 'parent' && <ParentDashboard profile={profile} />}


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

      {/* Pending Scout Application - Show when user has role='user' AND has pending application */}
      {profile.role === 'user' && hasPendingApplication && pendingScoutApplication && (
        <PendingScoutApplication application={pendingScoutApplication} />
      )}

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

