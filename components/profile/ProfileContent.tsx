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
      <h1 className="text-4xl font-bold text-black mb-8">Profile</h1>

      {/* Profile Card */}
      <div className="flex items-start gap-6 mb-8 p-6 bg-white border border-gray-200 rounded-lg">
        <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
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

      {/* Pricing Section - Only show for scouts */}
      {profile.role === 'scout' && (
        <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-black">Pricing & Turnaround</h3>
              <span className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded">
                Scouts Only
              </span>
            </div>
            {!isEditingPricing && (
              <button
                onClick={() => setIsEditingPricing(true)}
                className="px-6 py-2 bg-gray-100 text-black rounded hover:bg-gray-200 font-medium"
              >
                Update
              </button>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label htmlFor="price_per_eval" className="block text-sm font-medium text-black">
                  Price per Evaluation (USD)
                </label>
                <button
                  type="button"
                  onClick={() => setInfoModal('price')}
                  className="w-4 h-4 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center hover:bg-gray-500 transition-colors"
                  aria-label="Information about price per evaluation"
                >
                  i
                </button>
              </div>
              {isEditingPricing ? (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    id="price_per_eval"
                    value={pricePerEval}
                    onChange={(e) => setPricePerEval(e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="99"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
                  />
                </div>
              ) : (
                <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-black">
                  ${pricePerEval || '99'}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label htmlFor="turnaround_time" className="block text-sm font-medium text-black">
                  Turnaround Time
                </label>
                <button
                  type="button"
                  onClick={() => setInfoModal('turnaround')}
                  className="w-4 h-4 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center hover:bg-gray-500 transition-colors"
                  aria-label="Information about turnaround time"
                >
                  i
                </button>
              </div>
              {isEditingPricing ? (
                <>
                  <div className="relative">
                    <input
                      type="number"
                      id="turnaround_time"
                      value={turnaroundTime.replace(/[^0-9]/g, '') || ''}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/[^0-9]/g, '')
                        setTurnaroundTime(numericValue ? `${numericValue} hrs` : '')
                      }}
                      placeholder="24"
                      min="0"
                      className="w-full pl-4 pr-16 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white mb-3"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                      hrs
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSavePricing}
                      disabled={saving}
                      className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 font-medium"
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
                      className="px-6 py-2 border border-gray-300 text-black rounded hover:bg-gray-50 font-medium"
                    >
                      Cancel
                    </button>
                    {saveMessage && (
                      <p className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                        {saveMessage}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-black">
                  {turnaroundTime || '72 hrs'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

