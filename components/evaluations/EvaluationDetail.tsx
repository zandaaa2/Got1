'use client'

import Image from 'next/image'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HeaderMenu from '@/components/shared/HeaderMenu'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'

interface EvaluationDetailProps {
  evaluation: any
  isScout: boolean
  userId: string
  scoutProfile?: any // Optional scout profile for displaying scout's own profile card (includes turnaround_time)
}

export default function EvaluationDetail({
  evaluation,
  isScout,
  userId,
  scoutProfile,
}: EvaluationDetailProps) {
  const [notes, setNotes] = useState(evaluation.notes || '')
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [denying, setDenying] = useState(false)
  const [deniedReason, setDeniedReason] = useState('')
  const router = useRouter()
  const supabase = createClient()
  
  // Minimum character requirement
  const MIN_CHARACTERS = 1000
  
  /**
   * Gets the trimmed character count (excluding trailing whitespace).
   */
  const getTrimmedCharacterCount = (text: string): number => {
    // Remove trailing whitespace and get length
    return text.trimEnd().length
  }
  
  const trimmedCount = getTrimmedCharacterCount(notes)
  const isValid = trimmedCount >= MIN_CHARACTERS

  /**
   * Handles scout confirmation of evaluation request.
   * Creates payment session for player to complete.
   */
  const handleConfirmRequest = async () => {
    if (!isScout) return

    try {
      setConfirming(true)
      
      const response = await fetch('/api/evaluation/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluationId: evaluation.id,
          action: 'confirm',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm evaluation')
      }

      // If payment URL is provided, redirect player to payment
      // For now, we'll refresh to show updated status
      if (data.paymentUrl) {
        // Player will need to complete payment, but scout sees confirmation message
        alert('Evaluation confirmed! The player will be notified to complete payment.')
        router.refresh()
      } else {
        router.refresh()
      }
    } catch (error: any) {
      console.error('Error confirming evaluation:', error)
      alert(error.message || 'Failed to confirm evaluation. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  /**
   * Handles scout denial of evaluation request.
   */
  const handleDenyRequest = async () => {
    if (!isScout) return

    if (!deniedReason.trim()) {
      alert('Please provide a reason for denying this evaluation request.')
      return
    }

    if (!confirm('Are you sure you want to deny this evaluation request? The player will be notified.')) {
      return
    }

    try {
      setDenying(true)
      
      const response = await fetch('/api/evaluation/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluationId: evaluation.id,
          action: 'deny',
          deniedReason: deniedReason.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deny evaluation')
      }

      alert('Evaluation request denied. The player has been notified.')
      router.push('/my-evals')
    } catch (error: any) {
      console.error('Error denying evaluation:', error)
      alert(error.message || 'Failed to deny evaluation. Please try again.')
    } finally {
      setDenying(false)
    }
  }

  /**
   * Handles submission of the evaluation.
   * Validates minimum character count before submitting.
   */
  const handleSubmitEvaluation = async () => {
    if (!isScout) return

    // Validate minimum character count (trimmed)
    const trimmedNotes = notes.trim()
    if (trimmedNotes.length < MIN_CHARACTERS) {
      alert(`Please write at least ${MIN_CHARACTERS.toLocaleString()} characters. You currently have ${trimmedNotes.length.toLocaleString()} characters.`)
      return
    }

    try {
      setSubmitting(true)
      // Submit with trimmed notes (remove trailing/leading whitespace)
      const { error } = await supabase
        .from('evaluations')
        .update({
          notes: trimmedNotes,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', evaluation.id)

      if (error) throw error

      // Send email notification to player
      try {
        await fetch('/api/evaluation/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            evaluationId: evaluation.id,
          }),
        })
      } catch (emailError) {
        console.error('Error sending completion email:', emailError)
        // Don't block the redirect if email fails
      }

      // Redirect to confirmation page
      router.push(`/evaluations/${evaluation.id}/confirmation`)
    } catch (error) {
      console.error('Error submitting evaluation:', error)
      alert('Failed to submit evaluation. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const player = evaluation.player

  /**
   * Formats a date string to a readable format.
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    })
  }

  if (!isScout) {
    // Player view - show scout's profile card and evaluation
    const scout = evaluation.scout
    
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/evaluations')}
          className="mb-4 md:mb-6 flex items-center gap-2 text-black hover:opacity-70 text-sm md:text-base"
        >
          <svg
            className="w-5 h-5 md:w-6 md:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="md:hidden">Back</span>
        </button>

        {/* Scout Profile Card - Show for requested status */}
        {evaluation.status === 'requested' && (
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 mb-6 md:mb-8">
            <Link 
              href={`/profile/${scout?.id || ''}`}
              className="flex flex-col md:flex-row items-start gap-4 md:gap-6 flex-1 hover:opacity-90 transition-opacity"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex-shrink-0 mx-auto md:mx-0">
                {isMeaningfulAvatar(scout?.avatar_url) ? (
                  <Image
                    src={scout.avatar_url}
                    alt={scout.full_name || 'Scout'}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-3xl font-semibold text-white ${getGradientForId(scout?.id || evaluation.scout_id || evaluation.id)}`}>
                    {scout?.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="flex-1 w-full text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
                  {scout?.full_name || 'Unknown Scout'}
                </h1>
                {(scout?.position || scout?.organization) && (
                  <p className="text-black mb-2">
                    {scout?.position && scout?.organization
                      ? `${scout.position} at ${scout.organization}`
                      : scout?.position
                      ? scout.position
                      : scout?.organization
                      ? scout.organization
                      : ''}
                  </p>
                )}
                {scout?.social_link && (
                  <a
                    href={scout.social_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline mb-2 block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {scout.social_link.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {scout?.bio && (
                  <p className="text-black mt-4 leading-relaxed whitespace-pre-wrap">
                    {scout.bio}
                  </p>
                )}
              </div>
            </Link>
            {/* Three-dot menu for canceling */}
            <div className="flex-shrink-0">
              <HeaderMenu 
                userId={userId} 
                scoutId={scout?.user_id}
                evaluationId={evaluation?.id}
                onCancelled={() => {
                  router.push('/my-evals')
                }}
              />
            </div>
          </div>
        )}

        {/* Status-based content */}
        {evaluation.status === 'requested' && evaluation.payment_status === 'paid' ? (
          <div className="mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-black mb-3 md:mb-4">Awaiting Scout Response</h2>
            <div className="p-4 md:p-6 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-black mb-2">
                Your payment of <strong>${evaluation.price}</strong> has been received and is held securely in escrow.
              </p>
              <p className="text-black text-sm mb-3">
                <strong>{scout?.full_name || 'The scout'}</strong> will review your request and either confirm or deny it.
              </p>
              <div className="text-sm text-gray-700 space-y-1">
                <p>💰 Payment secured in escrow</p>
                <p>✅ Automatic full refund if scout denies</p>
                <p>⏳ Scout will respond soon</p>
              </div>
            </div>
          </div>
        ) : evaluation.status === 'requested' && evaluation.payment_status === 'pending' ? (
          <div className="mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-black mb-3 md:mb-4">Complete Payment</h2>
            <div className="p-4 md:p-6 bg-yellow-50 rounded-lg border border-yellow-200 space-y-4">
              <div>
                <p className="text-black mb-2">
                  We've received your payment and it's being held in Got1's escrow account.
                </p>
                <p className="text-black text-sm">
                  Please keep an eye on your email for confirmation or denial of your application by the scout so you can proceed.
                </p>
              </div>
              <button
                onClick={() => router.push('/evaluations')}
                className="inline-flex items-center justify-center px-4 py-2 bg-black text-white rounded-md text-sm font-semibold hover:bg-gray-900 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        ) : evaluation.status === 'denied' ? (
          <div className="mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-black mb-3 md:mb-4">Evaluation Request Denied</h2>
            <div className="p-4 md:p-6 bg-red-50 rounded-lg border border-red-200">
              <p className="text-black mb-2">
                <strong>{scout?.full_name || 'The scout'}</strong> has declined your evaluation request.
              </p>
              {evaluation.denied_reason && (
                <p className="text-black text-sm mt-2 mb-2">
                  <strong>Reason:</strong> {evaluation.denied_reason}
                </p>
              )}
              {evaluation.payment_status === 'refunded' && (
                <p className="text-sm text-green-700 mt-2">
                  ✅ A full refund has been issued and will appear in your account within 5-10 business days.
                </p>
              )}
            </div>
          </div>
        ) : evaluation.status === 'confirmed' || evaluation.status === 'in_progress' ? (
          <div className="mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-black mb-3 md:mb-4">
              {evaluation.status === 'confirmed' ? 'Evaluation Confirmed' : 'Evaluation In Progress'}
            </h2>
            <div className="p-4 md:p-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-black">
                {evaluation.status === 'confirmed' 
                  ? 'Payment received. The scout is preparing your evaluation.' 
                  : 'The scout is working on your evaluation. They will complete it soon.'}
              </p>
            </div>
          </div>
        ) : evaluation.notes ? (
          <div className="mb-8">
            <div className="border-b border-gray-200 pb-6 mb-6">
              <Link
                href={`/profile/${scout?.id || ''}`}
                className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4 hover:opacity-90 transition-opacity"
              >
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0">
                  {isMeaningfulAvatar(scout?.avatar_url) ? (
                    <Image
                      src={scout.avatar_url}
                      alt={scout.full_name || 'Scout'}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 text-xl font-semibold">
                        {scout?.full_name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-black text-base md:text-lg mb-1 truncate">
                    {scout?.full_name || 'Unknown Scout'}
                  </h3>
                  <p className="text-black text-xs md:text-sm mb-1 truncate">
                    {scout?.position && scout?.organization
                      ? `${scout.position} at ${scout.organization}`
                      : scout?.position
                      ? scout.position
                      : scout?.organization
                      ? scout.organization
                      : 'Scout'}
                  </p>
                  <p className="text-black text-xs md:text-sm text-gray-600">
                    {formatDate(evaluation.created_at)}
                  </p>
                </div>
              </Link>
              {evaluation.notes && (
                <div className="pl-0 md:pl-20 mt-4 md:mt-0">
                  <p className="text-black leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                    {evaluation.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  // Scout view
  // If status is 'requested', show confirm/deny UI
  if (isScout && evaluation.status === 'requested') {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/my-evals')}
          className="mb-4 md:mb-6 flex items-center gap-2 text-black hover:opacity-70 text-sm md:text-base"
        >
          <svg
            className="w-5 h-5 md:w-6 md:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="md:hidden">Back</span>
        </button>

        {/* Player Profile Section */}
        <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex-shrink-0 mx-auto md:mx-0">
            {isMeaningfulAvatar(player?.avatar_url) ? (
              <Image
                src={player.avatar_url}
                alt={player.full_name || 'Player'}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-3xl font-semibold text-white ${getGradientForId(player?.id || evaluation.player_id || evaluation.id)}`}>
                {player?.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 w-full text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
              {player?.full_name || 'Unknown Player'}
            </h1>
            {(player?.position || player?.school) && (
              <p className="text-black mb-2">
                {player?.position && player?.school
                  ? `${player.position} at ${player.school}`
                  : player?.position
                  ? player.position
                  : player?.school
                  ? player.school
                  : ''}
                {player?.school && player?.graduation_year && ` (${player.graduation_year})`}
              </p>
            )}
            {player?.hudl_link && (
              <a
                href={player.hudl_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline mb-2 block"
              >
                {player.hudl_link.replace(/^https?:\/\//, '')}
              </a>
            )}
            {player?.bio && (
              <p className="text-black mt-4 leading-relaxed whitespace-pre-wrap">
                {player.bio}
              </p>
            )}
            {player?.parent_name && (
              <p className="text-black text-sm mt-2">
                Run by parent - {player.parent_name}
              </p>
            )}
          </div>
        </div>

        {/* Evaluation Request Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 md:p-8 mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4">
            Evaluation Request
          </h2>
          <div className="mb-6">
            <p className="text-black mb-4">
              <strong>{player?.full_name || 'This player'}</strong> has requested an evaluation from you.
            </p>
            <div className="bg-white border border-gray-200 rounded p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-black font-medium">Evaluation Price:</span>
                <span className="text-black font-bold text-lg">${evaluation.price?.toFixed(2) || '0.00'}</span>
              </div>
              {scoutProfile?.turnaround_time && (
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-black font-medium">Your Turnaround Time:</span>
                  </div>
                  <p className="text-black font-semibold text-base mt-1 ml-7">
                    {scoutProfile.turnaround_time}
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-600 mt-2">
                If you confirm, the player will be charged and payment will be held in escrow until you complete the evaluation.
              </p>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirmRequest}
            disabled={confirming || denying}
            className="w-full mb-4 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg transition-colors"
          >
            {confirming ? 'Confirming...' : 'Confirm & Accept Evaluation Request'}
          </button>

          {/* Deny Section */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-bold text-black mb-3">Deny Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              If you cannot accept this evaluation request, please provide a reason:
            </p>
            <textarea
              value={deniedReason}
              onChange={(e) => setDeniedReason(e.target.value)}
              placeholder="Enter reason for denying this request..."
              className="w-full min-h-[100px] p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black text-sm resize-none mb-4"
            />
            <button
              onClick={handleDenyRequest}
              disabled={confirming || denying || !deniedReason.trim()}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {denying ? 'Denying...' : 'Deny Request'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Scout view
  // If completed, show it like ProfileView. If confirmed/in_progress, show form.
  if (evaluation.status === 'completed' && evaluation.notes) {
    // Completed evaluation - show scout's own profile card and the evaluation
    const scout = scoutProfile || evaluation.scout
    
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/my-evals')}
          className="mb-4 md:mb-6 flex items-center gap-2 text-black hover:opacity-70 text-sm md:text-base"
        >
          <svg
            className="w-5 h-5 md:w-6 md:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="md:hidden">Back</span>
        </button>

        {/* Scout Profile Section - matches ProfileView exactly */}
        <Link 
          href={`/profile/${scout?.id || ''}`}
          className="flex flex-col md:flex-row items-start gap-4 md:gap-6 mb-6 md:mb-8 hover:opacity-90 transition-opacity"
        >
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex-shrink-0 mx-auto md:mx-0">
            {isMeaningfulAvatar(scout?.avatar_url) ? (
              <Image
                src={scout.avatar_url}
                alt={scout.full_name || 'Scout'}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-3xl font-semibold text-white ${getGradientForId(scout?.id || evaluation.scout_id || evaluation.id)}`}>
                {scout?.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 w-full text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
              {scout?.full_name || 'Unknown Scout'}
            </h1>
            {(scout?.position || scout?.organization) && (
              <p className="text-black mb-2">
                {scout?.position && scout?.organization
                  ? `${scout.position} at ${scout.organization}`
                  : scout?.position
                  ? scout.position
                  : scout?.organization
                  ? scout.organization
                  : ''}
              </p>
            )}
            {scout?.social_link && (
              <a
                href={scout.social_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline mb-2 block"
              >
                {scout.social_link.replace(/^https?:\/\//, '')}
              </a>
            )}
            {scout?.bio && (
              <p className="text-black mt-4 leading-relaxed whitespace-pre-wrap">
                {scout.bio}
              </p>
            )}
          </div>
        </Link>

        {/* Evaluation Section - matches ProfileView format (showing player info) */}
        <div className="mb-6 md:mb-8">
          <div className="border-b border-gray-200 pb-4 md:pb-6 mb-4 md:mb-6">
            <Link
              href={`/profile/${player?.id || ''}`}
              className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4 hover:opacity-90 transition-opacity"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0">
                {isMeaningfulAvatar(player?.avatar_url) ? (
                  <Image
                    src={player.avatar_url}
                    alt={player.full_name || 'Player'}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-600 text-xl font-semibold">
                      {player?.full_name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-black text-base md:text-lg mb-1 truncate">
                  {player?.full_name || 'Unknown Player'}
                </h3>
                <p className="text-black text-xs md:text-sm mb-1 truncate">
                  {player?.school || 'Unknown School'}
                  {player?.school && player?.graduation_year && ', '}
                  {player?.graduation_year && `${player.graduation_year}`}
                </p>
                <p className="text-black text-xs md:text-sm text-gray-600">
                  {formatDate(evaluation.created_at)}
                </p>
              </div>
            </Link>
            {evaluation.notes && (
              <div className="pl-0 md:pl-20 mt-4 md:mt-0">
                <p className="text-black leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                  {evaluation.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Pending/In Progress - show evaluation form
  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => router.push('/my-evals')}
        className="mb-4 md:mb-6 flex items-center gap-2 text-black hover:opacity-70 text-sm md:text-base"
      >
        <svg
          className="w-5 h-5 md:w-6 md:h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="md:hidden">Back</span>
      </button>

      {/* Player Profile Section */}
      <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex-shrink-0 mx-auto md:mx-0">
          {isMeaningfulAvatar(player?.avatar_url) ? (
            <Image
              src={player.avatar_url}
              alt={player.full_name || 'Player'}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-3xl font-semibold text-white ${getGradientForId(player?.id || evaluation.player_id || evaluation.id)}`}>
              {player?.full_name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>
        <div className="flex-1 w-full text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
            {player?.full_name || 'Unknown Player'}
          </h1>
          {(player?.position || player?.school) && (
            <p className="text-black mb-2">
              {player?.position && player?.school
                ? `${player.position} at ${player.school}`
                : player?.position
                ? player.position
                : player?.school
                ? player.school
                : ''}
              {player?.school && player?.graduation_year && ` (${player.graduation_year})`}
            </p>
          )}
          {player?.hudl_link && (
            <a
              href={player.hudl_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline mb-2 block"
            >
              {player.hudl_link.replace(/^https?:\/\//, '')}
            </a>
          )}
          {player?.social_link && (
            <a
              href={player.social_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline mb-2 block"
            >
              {player.social_link.replace(/^https?:\/\//, '')}
            </a>
          )}
          {player?.bio && (
            <p className="text-black mt-4 leading-relaxed whitespace-pre-wrap">
              {player.bio}
            </p>
          )}
          {player?.parent_name && (
            <p className="text-black text-sm mt-2">
              Run by parent - {player.parent_name}
            </p>
          )}
        </div>
      </div>

      {/* Evaluate Section */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 mb-3 md:mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-black">Evaluate</h2>
          <div className="text-xs md:text-sm">
            <span className={isValid ? 'text-green-600' : 'text-gray-600'}>
              {trimmedCount.toLocaleString()} / {MIN_CHARACTERS.toLocaleString()} characters
            </span>
            {!isValid && (
              <span className="text-red-600 ml-2">
                (Need {MIN_CHARACTERS - trimmedCount} more)
              </span>
            )}
          </div>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={`Begin typing... (minimum ${MIN_CHARACTERS.toLocaleString()} characters required)`}
          className="w-full min-h-[300px] md:min-h-[500px] p-3 md:p-4 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black text-sm md:text-lg leading-relaxed resize-none"
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
        />
        <div className="mt-2 text-xs md:text-sm text-gray-600">
          <p>Note: Trailing spaces are not counted toward the character minimum.</p>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmitEvaluation}
        disabled={submitting || !isValid}
        className="w-full mt-6 md:mt-8 px-4 md:px-6 py-3 md:py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm md:text-lg transition-colors"
      >
        {submitting ? 'Submitting...' : isValid ? 'Submit my evaluation' : `Write ${MIN_CHARACTERS - trimmedCount} more characters to submit`}
      </button>
    </div>
  )
}

