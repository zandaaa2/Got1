'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'

interface EvaluationsDashboardProps {
  schoolId: string
  schoolUsername: string
  pendingEvals: any[]
  allEvals: any[]
}

export default function EvaluationsDashboard({
  schoolId,
  schoolUsername,
  pendingEvals,
  allEvals,
}: EvaluationsDashboardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending')

  const handleConfirm = async (evaluationId: string) => {
    setLoading(evaluationId)
    try {
      const response = await fetch(`/api/high-school/${schoolId}/evaluations/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ evaluationId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm payment')
      }

      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to confirm payment')
    } finally {
      setLoading(null)
    }
  }

  const handleDeny = async (evaluationId: string, reason?: string) => {
    if (!confirm('Are you sure you want to deny this payment request?')) return

    setLoading(evaluationId)
    try {
      const response = await fetch(`/api/high-school/${schoolId}/evaluations/deny-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ evaluationId, reason }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deny payment')
      }

      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to deny payment')
    } finally {
      setLoading(null)
    }
  }

  const handleCancel = async (evaluationId: string) => {
    if (!confirm('Are you sure you want to cancel this evaluation? The player will be notified and can pay for it themselves.')) return

    setLoading(evaluationId)
    try {
      const response = await fetch(`/api/high-school/${schoolId}/evaluations/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ evaluationId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel evaluation')
      }

      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to cancel evaluation')
    } finally {
      setLoading(null)
    }
  }

  const activeEvals = allEvals.filter((item: any) => !item.school_cancelled_at)
  const completedEvals = allEvals.filter(
    (item: any) => item.evaluation?.status === 'completed' && !item.school_cancelled_at
  )

  return (
    <div>
      <h1 className="text-3xl font-bold text-black mb-6">Evaluations</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'pending'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Pending ({pendingEvals.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'all'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            All ({activeEvals.length})
          </button>
        </div>
      </div>

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingEvals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No pending payment requests.
            </div>
          ) : (
            pendingEvals.map((item: any) => {
              const evaluation = item.evaluation
              if (!evaluation) return null

              return (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-lg p-6"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-black">
                          {evaluation.player?.full_name || 'Player'}
                        </p>
                        <span className="text-gray-400">•</span>
                        <p className="text-gray-600">
                          Requested evaluation from{' '}
                          {evaluation.scout?.full_name || 'Scout'}
                          {evaluation.scout?.organization && ` at ${evaluation.scout.organization}`}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-black mb-1">
                        ${evaluation.price}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(evaluation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleConfirm(evaluation.id)}
                      disabled={loading === evaluation.id}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading === evaluation.id ? 'Processing...' : 'Approve & Pay'}
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for denial (optional):')
                        handleDeny(evaluation.id, reason || undefined)
                      }}
                      disabled={loading === evaluation.id}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* All Tab */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {activeEvals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No evaluations yet.
            </div>
          ) : (
            activeEvals.map((item: any) => {
              const evaluation = item.evaluation
              if (!evaluation) return null

              const canCancel = item.paid_by === 'school' && evaluation.status !== 'completed'

              return (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-lg p-6"
                >
                  <Link
                    href={`/evaluations/${evaluation.id}`}
                    className="block hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-start gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-black">
                            {evaluation.player?.full_name || 'Player'}
                          </p>
                          <span className="text-gray-400">•</span>
                          <p className="text-gray-600 text-sm">
                            {evaluation.scout?.full_name || 'Scout'}
                            {evaluation.scout?.organization && ` at ${evaluation.scout.organization}`}
                          </p>
                        </div>
                        {evaluation.status === 'completed' && evaluation.notes && (
                          <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                            {evaluation.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>${evaluation.price}</span>
                          <span>{new Date(evaluation.created_at).toLocaleDateString()}</span>
                          <span className={`px-2 py-1 rounded ${
                            evaluation.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : evaluation.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {evaluation.status}
                          </span>
                          {item.paid_by === 'school' && (
                            <span className="text-blue-600">School Paid</span>
                          )}
                          {item.shared_by_player && (
                            <span className="text-purple-600">Shared by Player</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>

                  {canCancel && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleCancel(evaluation.id)}
                        disabled={loading === evaluation.id}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        {loading === evaluation.id ? 'Cancelling...' : 'Cancel Evaluation'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}


