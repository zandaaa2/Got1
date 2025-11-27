'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getGradientForId } from '@/lib/gradients'

interface SelectReferrerContentProps {
  session: any
}

export default function SelectReferrerContent({ session }: SelectReferrerContentProps) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [approvedReferrers, setApprovedReferrers] = useState<any[]>([])
  const [selectedReferrerId, setSelectedReferrerId] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const loadApprovedReferrers = async () => {
      try {
        // Get all approved referral program applications
        const { data: applications } = await supabase
          .from('referral_program_applications')
          .select('user_id, status')
          .eq('status', 'approved')

        if (!applications || applications.length === 0) {
          setLoading(false)
          return
        }

        const referrerIds = applications.map(app => app.user_id)

        // Get profiles for approved referrers
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, username, avatar_url')
          .in('user_id', referrerIds)

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
        throw new Error(data.error || 'Failed to select referrer')
      }

      // Redirect to profile setup completion
      router.push('/profile')
    } catch (error: any) {
      console.error('Error selecting referrer:', error)
      alert(error.message || 'Failed to select referrer')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading referrers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black mb-2">Who Referred You?</h1>
        <p className="text-gray-600">
          Select the person who referred you to Got1. This helps us track referrals and reward those who bring new scouts to the platform.
        </p>
      </div>

      {approvedReferrers.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">No referrers available. You can skip this step.</p>
          <button
            onClick={() => router.push('/profile')}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Continue to Profile
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {approvedReferrers.map((referrer) => {
              const avatarUrl = referrer.avatar_url && isMeaningfulAvatar(referrer.avatar_url)
                ? referrer.avatar_url
                : null
              const initial = (referrer.full_name || referrer.username || '?').charAt(0).toUpperCase()
              const gradientKey = referrer.user_id

              return (
                <button
                  key={referrer.user_id}
                  onClick={() => setSelectedReferrerId(referrer.user_id)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    selectedReferrerId === referrer.user_id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {avatarUrl && !imageErrors.has(referrer.user_id) ? (
                      <Image
                        src={avatarUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="rounded-full object-cover"
                        onError={() => setImageErrors(prev => new Set(prev).add(referrer.user_id))}
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${getGradientForId(gradientKey)}`}>
                        {initial}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-black">{referrer.full_name || 'Unknown'}</p>
                      {referrer.username && (
                        <p className="text-sm text-gray-600">@{referrer.username}</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => router.push('/profile')}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
            >
              Skip This Step
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

