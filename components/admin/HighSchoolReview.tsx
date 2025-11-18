'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getGradientForId } from '@/lib/gradients'

interface HighSchoolReviewProps {
  school: any
}

export default function HighSchoolReview({ school }: HighSchoolReviewProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDecision = async (decision: 'approved' | 'denied') => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/high-schools/${school.id}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process decision')
      }

      if (data.success) {
        // Redirect back to list with filter
        const filterParam = decision === 'approved' ? '?filter=approved' : '?filter=denied'
        router.push(`/admin/high-schools${filterParam}`)
      } else {
        throw new Error('Update did not succeed')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process decision')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold text-black">{school.name}</h1>
        <span
          className={`px-3 py-1 text-sm font-semibold rounded ${
            school.admin_status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : school.admin_status === 'approved'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {school.admin_status.toUpperCase()}
        </span>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* School Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-black mb-4">School Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Username</label>
              <p className="text-black font-mono">{school.username}</p>
            </div>
            {school.address && (
              <div>
                <label className="text-sm font-medium text-gray-600">Address</label>
                <p className="text-black">{school.address}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-600">Created</label>
              <p className="text-black">
                {new Date(school.created_at).toLocaleDateString()} at{' '}
                {new Date(school.created_at).toLocaleTimeString()}
              </p>
            </div>
            {school.admin_reviewed_at && (
              <div>
                <label className="text-sm font-medium text-gray-600">Reviewed</label>
                <p className="text-black">
                  {new Date(school.admin_reviewed_at).toLocaleDateString()} at{' '}
                  {new Date(school.admin_reviewed_at).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Creator & Stats */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-black mb-4">Creator & Stats</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Created By</label>
              <div className="flex items-center gap-3 mt-2">
                {school.creator_profile?.avatar_url ? (
                  <Image
                    src={school.creator_profile.avatar_url}
                    alt={school.creator_profile.full_name || 'Creator'}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getGradientForId(
                      school.created_by
                    )}`}
                  >
                    {school.creator_profile?.full_name?.charAt(0) || '?'}
                  </div>
                )}
                <p className="text-black">{school.creator_profile?.full_name || 'Unknown'}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Admins</label>
              <p className="text-black">{school.admins?.length || 0} / 2</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Players</label>
              <p className="text-black">{school.player_count || 0}</p>
            </div>
            {school.referral_school && (
              <div>
                <label className="text-sm font-medium text-gray-600">Referred By</label>
                <p className="text-black">{school.referral_school.name}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin List */}
      {school.admins && school.admins.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-black mb-4">Admins</h2>
          <div className="space-y-3">
            {school.admins.map((admin: any) => (
              <div key={admin.user_id} className="flex items-center gap-3">
                {admin.profile?.avatar_url ? (
                  <Image
                    src={admin.profile.avatar_url}
                    alt={admin.profile.full_name || 'Admin'}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getGradientForId(
                      admin.user_id
                    )}`}
                  >
                    {admin.profile?.full_name?.charAt(0) || '?'}
                  </div>
                )}
                <p className="text-black">{admin.profile?.full_name || 'Unknown'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {school.admin_status === 'pending' && (
        <div className="flex gap-4">
          <button
            onClick={() => handleDecision('approved')}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={() => handleDecision('denied')}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Deny'}
          </button>
        </div>
      )}

      {school.admin_status !== 'pending' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-gray-600 text-sm">
            This school has already been {school.admin_status}.
          </p>
        </div>
      )}
    </div>
  )
}


