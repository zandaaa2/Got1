'use client'

import { useState, useEffect } from 'react'

interface ReferralDashboardProps {
  school: any
  featureActive: boolean
  stats: any
  referrals: any[]
}

export default function ReferralDashboard({
  school,
  featureActive,
  stats,
  referrals: initialReferrals,
}: ReferralDashboardProps) {
  const [referrals, setReferrals] = useState(initialReferrals)
  const [statsData, setStatsData] = useState(stats)

  useEffect(() => {
    if (featureActive) {
      loadStats()
      loadReferrals()
    }
  }, [featureActive, school.id])

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/high-school/${school.id}/referral/stats`)
      const data = await response.json()
      if (data.success && data.stats) {
        setStatsData(data.stats)
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const loadReferrals = async () => {
    try {
      const response = await fetch(`/api/high-school/${school.id}/referral/list`)
      const data = await response.json()
      if (data.success && data.referrals) {
        setReferrals(data.referrals)
      }
    } catch (err) {
      console.error('Error loading referrals:', err)
    }
  }

  if (!featureActive) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-black mb-6">Referral Program</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">
            The referral program has ended. Thank you for participating!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-black mb-6">Referral Program</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <p className="text-blue-800 mb-2">
          <strong>Refer a high school and earn $20!</strong>
        </p>
        <p className="text-blue-700 text-sm">
          When you refer another high school and they get approved, you'll receive a $20 bonus.
        </p>
        <p className="text-blue-700 text-sm mt-2">
          <strong>Program ends:</strong> February 28, 2026
        </p>
      </div>

      {/* Stats */}
      {statsData && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-black">{statsData.totalReferred || 0}</div>
            <div className="text-sm text-gray-600">Total Referred</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              ${(statsData.paid || 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Earned</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">
              ${(statsData.pending || 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </div>
      )}

      {/* Referred Schools List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-black mb-4">Referred Schools</h2>
        {referrals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            You haven't referred any schools yet.
          </div>
        ) : (
          <div className="space-y-4">
            {referrals.map((referral: any) => {
              const referredSchool = referral.referred_school
              return (
                <div
                  key={referral.id}
                  className="border-b border-gray-200 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-black">
                        {referredSchool?.name || 'Unknown School'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Referred: {new Date(referral.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-black">${referral.bonus_amount || 0}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          referral.bonus_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : referral.bonus_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {referral.bonus_status}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


