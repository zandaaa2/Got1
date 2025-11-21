'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getGradientForId } from '@/lib/gradients'

interface ReferralApplication {
  id: string
  user_id: string
  status: 'pending' | 'approved' | 'denied'
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  profile: {
    id: string
    full_name: string | null
    avatar_url: string | null
    username: string | null
    user_id: string
  } | null
}

interface ReferralApplicationsListProps {
  applications: ReferralApplication[]
}

export default function ReferralApplicationsList({ applications }: ReferralApplicationsListProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const router = useRouter()

  const handleDecision = async (applicationId: string, action: 'approve' | 'deny') => {
    if (!confirm(`Are you sure you want to ${action === 'approve' ? 'approve' : 'deny'} this application?`)) {
      return
    }

    setLoading(applicationId)
    setError(null)

    try {
      const response = await fetch(`/api/admin/referrals/${applicationId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} application`)
      }

      // Refresh the page to show updated status
      router.refresh()
    } catch (err: any) {
      console.error(`Error ${action}ing application:`, err)
      setError(err.message || `Failed to ${action} application`)
      setLoading(null)
    }
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No referral program applications found.</p>
      </div>
    )
  }

  const pendingApplications = applications.filter(app => app.status === 'pending')
  const reviewedApplications = applications.filter(app => app.status !== 'pending')

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Pending Applications */}
      {pendingApplications.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-black mb-4">
            Pending Applications ({pendingApplications.length})
          </h2>
          <div className="space-y-4">
            {pendingApplications.map((app) => {
              const profile = app.profile
              const avatarUrl = profile?.avatar_url && isMeaningfulAvatar(profile.avatar_url)
                ? profile.avatar_url
                : null
              const initial = (profile?.full_name || profile?.username || '?').charAt(0).toUpperCase()
              const gradientKey = app.user_id

              return (
                <div
                  key={app.id}
                  className="bg-white border-2 border-yellow-200 rounded-lg p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {avatarUrl && !imageErrors.has(app.user_id) ? (
                        <Image
                          src={avatarUrl}
                          alt=""
                          width={64}
                          height={64}
                          className="rounded-full object-cover"
                          onError={() => setImageErrors(prev => new Set(prev).add(app.user_id))}
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${getGradientForId(gradientKey)}`}>
                          {initial}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-black mb-1">
                          {profile?.full_name || 'Unknown User'}
                        </h3>
                        {profile?.username && (
                          <p className="text-sm text-gray-600 mb-2">@{profile.username}</p>
                        )}
                        <p className="text-sm text-gray-600">
                          Applied: {new Date(app.created_at).toLocaleDateString()} at {new Date(app.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDecision(app.id, 'approve')}
                        disabled={loading === app.id}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                      >
                        {loading === app.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleDecision(app.id, 'deny')}
                        disabled={loading === app.id}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                      >
                        {loading === app.id ? 'Processing...' : 'Deny'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Reviewed Applications */}
      {reviewedApplications.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-black mb-4">
            Reviewed Applications ({reviewedApplications.length})
          </h2>
          <div className="space-y-4">
            {reviewedApplications.map((app) => {
              const profile = app.profile
              const avatarUrl = profile?.avatar_url && isMeaningfulAvatar(profile.avatar_url)
                ? profile.avatar_url
                : null
              const initial = (profile?.full_name || profile?.username || '?').charAt(0).toUpperCase()
              const gradientKey = app.user_id
              const statusColor = app.status === 'approved' ? 'green' : 'red'

              return (
                <div
                  key={app.id}
                  className={`bg-white border-2 ${
                    app.status === 'approved' ? 'border-green-200' : 'border-red-200'
                  } rounded-lg p-6 shadow-sm`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {avatarUrl && !imageErrors.has(app.user_id) ? (
                        <Image
                          src={avatarUrl}
                          alt=""
                          width={64}
                          height={64}
                          className="rounded-full object-cover"
                          onError={() => setImageErrors(prev => new Set(prev).add(app.user_id))}
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${getGradientForId(gradientKey)}`}>
                          {initial}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-black">
                            {profile?.full_name || 'Unknown User'}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            app.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </span>
                        </div>
                        {profile?.username && (
                          <p className="text-sm text-gray-600 mb-2">@{profile.username}</p>
                        )}
                        <p className="text-sm text-gray-600">
                          Applied: {new Date(app.created_at).toLocaleDateString()}
                        </p>
                        {app.reviewed_at && (
                          <p className="text-sm text-gray-600">
                            Reviewed: {new Date(app.reviewed_at).toLocaleDateString()} at {new Date(app.reviewed_at).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

