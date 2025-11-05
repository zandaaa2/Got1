'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ScoutApplicationReviewProps {
  application: any
}

export default function ScoutApplicationReview({
  application,
}: ScoutApplicationReviewProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDecision = async (decision: 'approved' | 'denied') => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/scout-application/${application.id}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Show detailed error message
        const errorMsg = data.error || 'Failed to process decision'
        const details = data.details ? ` (${data.details})` : ''
        throw new Error(errorMsg + details)
      }

      // Verify the update succeeded
      if (data.success) {
        console.log(`✅ Application ${decision} successfully`)
        
        // Small delay to ensure database update is committed
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Redirect to the applications list with the appropriate filter
        // Use full page reload with cache-busting to ensure fresh data
        const filterParam = decision === 'approved' ? '?filter=approved' : decision === 'denied' ? '?filter=denied' : ''
        const timestamp = Date.now()
        window.location.href = `/admin/scout-applications${filterParam}&_t=${timestamp}`
      } else {
        throw new Error('Update did not succeed')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process decision')
      setLoading(false)
    }
  }

  const profile = application.profile

  return (
    <div>
      <h1 className="text-3xl font-bold text-black mb-6">Scout Application Review</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-black mb-4">Applicant Information</h2>
        <div className="space-y-2">
          <p className="text-black">
            <strong>Name:</strong> {profile?.full_name || 'Unknown'}
          </p>
          <p className="text-black">
            <strong>User ID:</strong> {application.user_id || 'Not available'}
          </p>
          {profile && (
            <p className="text-black">
              <strong>Profile:</strong>{' '}
              <a 
                href={`/profile/${profile.id}`}
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Profile
              </a>
            </p>
          )}
          <p className="text-black">
            <strong>Status:</strong>{' '}
            <span
              className={`px-2 py-1 rounded ${
                application.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : application.status === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {application.status}
            </span>
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-black mb-4">Application Details</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-black mb-2">Current Workplace</h3>
            <p className="text-black">{application.current_workplace}</p>
          </div>

          <div>
            <h3 className="font-semibold text-black mb-2">Current Position</h3>
            <p className="text-black">{application.current_position}</p>
          </div>

          <div>
            <h3 className="font-semibold text-black mb-2">Work History</h3>
            <p className="text-black whitespace-pre-wrap">{application.work_history}</p>
          </div>

          {application.additional_info && (
            <div>
              <h3 className="font-semibold text-black mb-2">Additional Information</h3>
              <p className="text-black whitespace-pre-wrap">{application.additional_info}</p>
            </div>
          )}
        </div>
      </div>

      {application.status === 'pending' && (
        <div className="flex gap-4">
          <button
            onClick={() => handleDecision('approved')}
            disabled={loading}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={() => handleDecision('denied')}
            disabled={loading}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Deny'}
          </button>
        </div>
      )}

      {application.status !== 'pending' && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded">
          <p className="text-black">
            This application has been {application.status}. No further action is needed.
          </p>
        </div>
      )}
    </div>
  )
}

