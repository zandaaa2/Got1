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
  calendly_meeting_completed: boolean | null
  calendly_meeting_date: string | null
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
  const [markingMeeting, setMarkingMeeting] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const router = useRouter()

  const handleMarkMeeting = async (applicationId: string) => {
    setMarkingMeeting(applicationId)
    setError(null)

    try {
      const response = await fetch(`/api/admin/referrals/${applicationId}/mark-meeting`, {
        method: 'POST',
      })

      let data: any = null
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to mark meeting as completed')
      }

      // Refresh the page to show updated status
      router.refresh()
    } catch (err: any) {
      console.error('Error marking meeting:', err)
      setError(err.message || 'Failed to mark meeting')
      setMarkingMeeting(null)
    }
  }

  const handleDecision = async (applicationId: string, action: 'approve' | 'deny') => {
    // Check if trying to approve without meeting
    if (action === 'approve') {
      const application = applications.find(app => app.id === applicationId)
      if (application && application.calendly_meeting_completed !== true) {
        if (!confirm('This applicant has not completed a Calendly meeting. Are you sure you want to approve without a meeting?')) {
          return
        }
      }
    }

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

      let data: any = null
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok) {
        throw new Error(data?.error || `Failed to ${action} application`)
      }

      // Refresh the page to show updated status
      router.refresh()
    } catch (err: any) {
      console.error(`Error ${action}ing application:`, err)
      setError(err.message || `Failed to ${action} application`)
      setLoading(null)
    }
  }

  const handleRevoke = async (userId: string) => {
    if (!confirm('Are you sure you want to revoke this user\'s ability to earn referrals? They will no longer appear as an option for new scouts to select as a referrer.')) {
      return
    }

    setRevoking(userId)
    setError(null)

    try {
      const response = await fetch(`/api/admin/referrals/${userId}/revoke`, {
        method: 'POST',
      })

      let data: any = null
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to revoke referrer status')
      }

      // Refresh the page to show updated status
      router.refresh()
    } catch (err: any) {
      console.error('Error revoking referrer status:', err)
      setError(err.message || 'Failed to revoke referrer status')
      setRevoking(null)
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
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
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
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
                        <div className="mt-2">
                          <p className={`text-sm font-medium ${
                            app.calendly_meeting_completed === true
                              ? 'text-green-600' 
                              : 'text-yellow-600'
                          }`}>
                            {app.calendly_meeting_completed === true
                              ? '✓ Calendly meeting completed' 
                              : '⚠️ Calendly meeting not completed'}
                          </p>
                          {app.calendly_meeting_date && (
                            <p className="text-xs text-gray-500">
                              Meeting date: {new Date(app.calendly_meeting_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {app.calendly_meeting_completed !== true && (
                        <button
                          onClick={() => handleMarkMeeting(app.id)}
                          disabled={markingMeeting === app.id}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                          {markingMeeting === app.id ? 'Marking...' : 'Mark Meeting Completed'}
                        </button>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDecision(app.id, 'approve')}
                          disabled={loading === app.id}
                          className={`px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors ${
                            app.calendly_meeting_completed !== true
                              ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                              : 'bg-black text-white hover:bg-gray-800'
                          }`}
                        >
                          {loading === app.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleDecision(app.id, 'deny')}
                          disabled={loading === app.id}
                          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                          {loading === app.id ? 'Processing...' : 'Deny'}
                        </button>
                      </div>
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
                  className={`bg-white border ${
                    app.status === 'approved' ? 'border-green-200' : 'border-red-200'
                  } rounded-2xl p-6 shadow-sm`}
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
                    {app.status === 'approved' && (
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => handleRevoke(app.user_id)}
                          disabled={revoking === app.user_id}
                          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                          {revoking === app.user_id ? 'Revoking...' : 'Revoke Referrer Status'}
                        </button>
                      </div>
                    )}
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

