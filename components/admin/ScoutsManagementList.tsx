'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface ScoutsManagementListProps {
  scouts: any[]
}

/**
 * Component for displaying and managing active scouts with options to revoke scout status or suspend.
 */
export default function ScoutsManagementList({ scouts }: ScoutsManagementListProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSuspendModal, setShowSuspendModal] = useState<string | null>(null)
  const [suspendDays, setSuspendDays] = useState('7')
  const [suspendReason, setSuspendReason] = useState('')

  /**
   * Revokes a scout's verification by changing their role back to 'player'.
   *
   * @param {string} userId - The user ID of the scout to revoke
   * @returns {Promise<void>}
   */
  const handleRevokeScout = async (userId: string) => {
    if (!confirm('Are you sure you want to revoke this scout\'s verification? They will be changed back to a player.')) {
      return
    }

    setLoading(userId)
    setError(null)

    try {
      console.log('Attempting to revoke scout status for user:', userId)
      const response = await fetch(`/api/admin/scouts/${userId}/revoke`, {
        method: 'POST',
      })

      const data = await response.json()
      console.log('Revoke response:', response.status, data)

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to revoke scout status'
        const details = data.details ? ` (${data.details})` : ''
        const code = data.code ? ` [Code: ${data.code}]` : ''
        const fullErrorMsg = `${errorMsg}${details}${code}`
        console.error('Revoke failed:', fullErrorMsg, data)
        throw new Error(fullErrorMsg)
      }

      console.log('✅ Scout status revoked successfully')
      // Refresh the page to show updated status
      window.location.reload()
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to revoke scout status'
      console.error('Error revoking scout:', err)
      setError(errorMsg)
      setLoading(null)
    }
  }

  /**
   * Suspends a scout for a specified number of days.
   *
   * @param {string} userId - The user ID of the scout to suspend
   * @returns {Promise<void>}
   */
  const handleSuspend = async (userId: string) => {
    const days = parseInt(suspendDays)
    if (isNaN(days) || days < 1) {
      setError('Please enter a valid number of days (minimum 1)')
      return
    }

    setLoading(userId)
    setError(null)

    try {
      const response = await fetch(`/api/admin/scouts/${userId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          days: days,
          reason: suspendReason.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to suspend scout')
      }

      // Close modal and refresh
      setShowSuspendModal(null)
      setSuspendDays('7')
      setSuspendReason('')
      window.location.reload()
    } catch (err: any) {
      setError(err.message || 'Failed to suspend scout')
      setLoading(null)
    }
  }

  /**
   * Lifts a scout's suspension immediately.
   *
   * @param {string} userId - The user ID of the scout to unsuspend
   * @returns {Promise<void>}
   */
  const handleUnsuspend = async (userId: string) => {
    if (!confirm('Are you sure you want to lift this scout\'s suspension?')) {
      return
    }

    setLoading(userId)
    setError(null)

    try {
      const response = await fetch(`/api/admin/scouts/${userId}/unsuspend`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to lift suspension')
      }

      window.location.reload()
    } catch (err: any) {
      setError(err.message || 'Failed to lift suspension')
      setLoading(null)
    }
  }

  const isSuspended = (scout: any) => {
    if (!scout.suspended_until) return false
    return new Date(scout.suspended_until) > new Date()
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {scouts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No scouts found.
        </div>
      ) : (
        <div className="space-y-4">
          {scouts.map((scout) => {
            const suspended = isSuspended(scout)
            const suspendUntil = scout.suspended_until
              ? new Date(scout.suspended_until)
              : null

            return (
              <div
                key={scout.id}
                className="p-6 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {scout.avatar_url ? (
                        <Image
                          src={scout.avatar_url}
                          alt={scout.full_name || 'Profile'}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 text-xl font-semibold">
                            {scout.full_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-black text-lg">
                          {scout.full_name || 'Unknown'}
                        </h3>
                        <Link
                          href={`/profile/${scout.id}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Profile
                        </Link>
                      </div>
                      <p className="text-black text-sm mb-1">
                        <strong>Organization:</strong> {scout.organization || 'Not specified'}
                      </p>
                      <p className="text-black text-sm mb-1">
                        <strong>Price per Eval:</strong> ${scout.price_per_eval || '99.00'}
                      </p>
                      {suspended && suspendUntil && (
                        <div className="mt-2">
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                            Suspended until {suspendUntil.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          {scout.suspended_reason && (
                            <p className="text-sm text-gray-600 mt-1">
                              Reason: {scout.suspended_reason}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {suspended ? (
                      <button
                        onClick={() => handleUnsuspend(scout.user_id)}
                        disabled={loading === scout.user_id}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-medium"
                      >
                        {loading === scout.user_id ? 'Processing...' : 'Lift Suspension'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowSuspendModal(scout.user_id)}
                        disabled={loading === scout.user_id}
                        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 font-medium"
                      >
                        Suspend
                      </button>
                    )}
                    <button
                      onClick={() => handleRevokeScout(scout.user_id)}
                      disabled={loading === scout.user_id}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-medium"
                    >
                      {loading === scout.user_id ? 'Processing...' : 'Revoke Scout Status'}
                    </button>
                  </div>
                </div>

                {/* Suspend Modal */}
                {showSuspendModal === scout.user_id && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-bold text-black mb-3">Suspend Scout</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Number of Days
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={suspendDays}
                          onChange={(e) => setSuspendDays(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                          placeholder="7"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Reason (Optional)
                        </label>
                        <textarea
                          value={suspendReason}
                          onChange={(e) => setSuspendReason(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                          placeholder="e.g., Low quality evaluations"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSuspend(scout.user_id)}
                          disabled={loading === scout.user_id}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-medium"
                        >
                          {loading === scout.user_id ? 'Suspending...' : 'Confirm Suspend'}
                        </button>
                        <button
                          onClick={() => {
                            setShowSuspendModal(null)
                            setSuspendDays('7')
                            setSuspendReason('')
                          }}
                          className="px-4 py-2 border border-gray-300 text-black rounded hover:bg-gray-50 font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

