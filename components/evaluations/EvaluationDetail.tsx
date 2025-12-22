'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HeaderMenu from '@/components/shared/HeaderMenu'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'
import ShareButton from './ShareButton'
import { getProfilePath } from '@/lib/profile-url'

interface EvaluationDetailProps {
  evaluation: any
  isScout: boolean
  userId: string
  scoutProfile?: any // Optional scout profile for displaying scout's own profile card (includes turnaround_time)
  profilePath?: string // Optional profile path for back button (e.g., "/-nthony-anza" or "/profile/[id]")
  fromProfile?: 'scout' | 'player' // Optional: indicates which profile page the user came from
}

export default function EvaluationDetail({
  evaluation,
  isScout,
  userId,
  scoutProfile,
  profilePath,
  fromProfile,
}: EvaluationDetailProps) {
  const [notes, setNotes] = useState(evaluation.notes || '')
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [denying, setDenying] = useState(false)
  const [deniedReason, setDeniedReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])
  
  // Track evaluation view (increments both evaluation view count and scout's profile view count)
  // Only counts scout profile view if viewer is NOT the scout themselves
  useEffect(() => {
    if (evaluation?.id) {
      const today = new Date().toDateString()
      const viewKey = `eval_view_${evaluation.id}_${today}`
      
      if (typeof window !== 'undefined' && !localStorage.getItem(viewKey)) {
        // Track view on the evaluation itself (always track, even if scout views their own)
        fetch(`/api/evaluation/${evaluation.id}/track-view`, {
          method: 'POST',
        }).catch(console.error)
        
        // Track view on scout's profile ONLY if viewer is NOT the scout themselves
        // isScout is true when the current user is the scout who wrote the evaluation
        const scoutProfileId = evaluation.scout?.id
        if (scoutProfileId && !isScout) {
          const scoutViewKey = `scout_profile_view_from_eval_${scoutProfileId}_${today}`
          if (!localStorage.getItem(scoutViewKey)) {
            fetch(`/api/profile/${scoutProfileId}/track-view`, {
              method: 'POST',
            }).catch(console.error)
            
            localStorage.setItem(scoutViewKey, 'true')
          }
        }
        
        localStorage.setItem(viewKey, 'true')
      }
    }
  }, [evaluation?.id, evaluation?.scout?.id, isScout])
  
  // Minimum character requirement: 250 for free evals, 1000 for paid evals
  const isFreeEval = evaluation.price === 0
  const MIN_CHARACTERS = isFreeEval ? 250 : 1000
  
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

      // Send email notification to player and create in-app notification
      try {
        console.log('📧 Calling /api/evaluation/complete for evaluation:', evaluation.id)
        const response = await fetch('/api/evaluation/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            evaluationId: evaluation.id,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('❌ Failed to complete evaluation processing:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          })
        } else {
          const data = await response.json()
          console.log('✅ Evaluation completion processing successful:', data)
        }
      } catch (emailError) {
        console.error('❌ Error calling completion API:', emailError)
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

  /**
   * Handles cancellation/deletion of the evaluation by the scout.
   * Uses the API endpoint to delete the evaluation and navigates back to my-evals.
   * Only allowed for free in_progress evaluations.
   */
  const handleCancelEvaluation = async () => {
    if (!isScout) return

    // Only allow cancellation of free in_progress evaluations
    if (!isFreeEval || evaluation.status !== 'in_progress') {
      alert('You can only cancel free evaluations that are in progress.')
      return
    }

    if (!confirm('Are you sure you want to cancel this evaluation? This action cannot be undone.')) {
      return
    }

    try {
      setCancelling(true)

      // Use API endpoint to cancel (which handles deletion for scouts)
      const response = await fetch('/api/evaluation/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ evaluationId: evaluation.id }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Cancel API error:', result)
        throw new Error(result.error || 'Failed to cancel evaluation')
      }

      console.log('✅ Evaluation cancelled successfully:', evaluation.id)

      // Navigate back to my-evals - the real-time subscription will update the list
      router.push('/my-evals')
    } catch (error: any) {
      console.error('Error cancelling evaluation:', error)
      const errorMessage = error?.message || 'Failed to cancel evaluation. Please try again.'
      alert(`Failed to cancel evaluation: ${errorMessage}`)
      setCancelling(false)
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
        {/* Header - back button removed */}
        <div className="mb-4 md:mb-6 flex items-center justify-between">
          <div></div>
        </div>

        {/* Scout Profile Card - Show for requested status */}
        {evaluation.status === 'requested' && (
          <div className="mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-4">
              <Link 
                href={scout?.id ? getProfilePath(scout.id, scout.username) : `/profile/${scout?.id || ''}`}
                className="flex items-center gap-3 md:gap-4 hover:opacity-90 transition-opacity flex-1"
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
                    <div
                      className={`w-full h-full flex items-center justify-center text-xl md:text-2xl font-semibold text-white ${getGradientForId(
                        scout?.user_id || evaluation.scout_id || scout?.id || evaluation.id
                      )}`}
                    >
                      {scout?.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-bold text-black mb-1">
                    {scout?.full_name || 'Unknown Scout'}
                  </h2>
                  {(scout?.position || scout?.organization) && (
                    <p className="text-sm text-gray-600">
                      {scout?.position && scout?.organization
                        ? `${scout.position} at ${scout.organization}`
                        : scout?.position
                        ? scout.position
                        : scout?.organization
                        ? scout.organization
                        : ''}
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

            {/* Eval Offer Box - Clickable purchase box */}
            {(() => {
              const isFreeEval = evaluation.price === 0
              const offerTitle = isFreeEval ? 'Free Evaluation' : (scout?.offer_title || 'Standard Evaluation')
              const offerDescription = isFreeEval ? scout?.free_eval_description : scout?.bio
              const offerPrice = evaluation.price || 0

              return (
                <div className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-black">{offerTitle}</h3>
                    <span className="text-lg font-bold text-black">${offerPrice.toFixed(2)}</span>
                  </div>
                  {offerDescription && (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {offerDescription}
                    </p>
                  )}
                  <div className="mt-4">
                    <Link
                      href={scout?.id ? `${getProfilePath(scout.id, scout.username)}?tab=offers` : `/profile/${scout?.id || ''}?tab=offers`}
                      className={`block w-full px-6 py-3 rounded-lg font-medium text-sm md:text-base transition-colors text-center ${
                        isFreeEval
                          ? 'bg-gray-200 text-black hover:bg-gray-300'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      style={!isFreeEval ? { backgroundColor: '#233dff' } : undefined}
                    >
                      {isFreeEval ? 'Request Free Evaluation' : 'Purchase Evaluation'}
                    </Link>
                  </div>
                </div>
              )
            })()}
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
                onClick={() => router.push('/my-evals')}
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
            {/* Reorder based on fromProfile */}
            {fromProfile === 'scout' ? (
              <>
                {/* Scout Profile Card - First when coming from scout's profile */}
                <div className="mb-6 md:mb-8">
                  <Link
                    href={scout?.id ? getProfilePath(scout.id, scout.username) : `/profile/${scout?.id || ''}`}
                    className="flex items-center gap-3 md:gap-4 mb-4 hover:opacity-90 transition-opacity"
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
                        <div
                          className={`w-full h-full flex items-center justify-center text-xl md:text-2xl font-semibold text-white ${getGradientForId(
                            scout?.user_id || evaluation.scout_id || scout?.id || evaluation.id
                          )}`}
                        >
                          {scout?.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg md:text-xl font-bold text-black mb-1">
                        {scout?.full_name || 'Unknown Scout'}
                      </h2>
                      {(scout?.position || scout?.organization) && (
                        <p className="text-sm text-gray-600">
                          {scout?.position && scout?.organization
                            ? `${scout.position} at ${scout.organization}`
                            : scout?.position
                            ? scout.position
                            : scout?.organization
                            ? scout.organization
                            : ''}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>

                {/* Eval Offer Box - Show the offer that was purchased */}
                {(() => {
                  const isFreeEval = evaluation.price === 0
                  const offerTitle = isFreeEval ? 'Free Evaluation' : (scout?.offer_title || 'Standard Evaluation')
                  const offerDescription = isFreeEval ? scout?.free_eval_description : scout?.bio
                  const offerPrice = evaluation.price || 0

                  return (
                    <div className="border border-gray-200 rounded-lg p-6 mb-6 md:mb-8 hover:border-gray-300 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-black">{offerTitle}</h3>
                        <span className="text-lg font-bold text-black">${offerPrice.toFixed(2)}</span>
                      </div>
                      {offerDescription && (
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {offerDescription}
                        </p>
                      )}
                      <div className="mt-4">
                        <Link
                          href={scout?.id ? `${getProfilePath(scout.id, scout.username)}?tab=offers` : `/profile/${scout?.id || ''}?tab=offers`}
                          className={`block w-full px-6 py-3 rounded-lg font-medium text-sm md:text-base transition-colors text-center ${
                            isFreeEval
                              ? 'bg-gray-200 text-black hover:bg-gray-300'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                          style={!isFreeEval ? { backgroundColor: '#233dff' } : undefined}
                        >
                          {isFreeEval ? 'Request Free Evaluation' : 'Purchase Evaluation'}
                        </Link>
                      </div>
                    </div>
                  )
                })()}

                {/* Player Profile Card - Second when coming from scout's profile */}
                {player && (
                  <div className="mb-6 md:mb-8">
                    <Link
                      href={player.id ? getProfilePath(player.id, player.username) : `/profile/${player.id || ''}`}
                      className="flex items-start gap-3 md:gap-4 mb-4 hover:opacity-90 transition-opacity"
                    >
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0">
                        {isMeaningfulAvatar(player.avatar_url) ? (
                          <Image
                            src={player.avatar_url}
                            alt={player.full_name || 'Player'}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${getGradientForId(
                            player.user_id || evaluation.player_id || player.id || evaluation.id
                          )}`}>
                            <span className="text-white text-xl font-semibold">
                              {player.full_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-black text-base md:text-lg mb-1 truncate">
                          {player.full_name || 'Unknown Player'}
                        </h3>
                        <p className="text-black text-xs md:text-sm mb-1 truncate">
                          {player.school || 'Unknown School'}
                          {player.school && player.graduation_year && ', '}
                          {player.graduation_year && `${player.graduation_year}`}
                        </p>
                        <p className="text-black text-xs md:text-sm text-gray-600">
                          {formatDate(evaluation.created_at)}
                        </p>
                      </div>
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Player Profile Card - First when coming from player's profile or default */}
                {player && (
                  <div className="mb-6 md:mb-8">
                    <Link
                      href={player.id ? getProfilePath(player.id, player.username) : `/profile/${player.id || ''}`}
                      className="flex items-start gap-3 md:gap-4 mb-4 hover:opacity-90 transition-opacity"
                    >
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0">
                        {isMeaningfulAvatar(player.avatar_url) ? (
                          <Image
                            src={player.avatar_url}
                            alt={player.full_name || 'Player'}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${getGradientForId(
                            player.user_id || evaluation.player_id || player.id || evaluation.id
                          )}`}>
                            <span className="text-white text-xl font-semibold">
                              {player.full_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-black text-base md:text-lg mb-1 truncate">
                          {player.full_name || 'Unknown Player'}
                        </h3>
                        <p className="text-black text-xs md:text-sm mb-1 truncate">
                          {player.school || 'Unknown School'}
                          {player.school && player.graduation_year && ', '}
                          {player.graduation_year && `${player.graduation_year}`}
                        </p>
                        <p className="text-black text-xs md:text-sm text-gray-600">
                          {formatDate(evaluation.created_at)}
                        </p>
                      </div>
                    </Link>
                  </div>
                )}

                {/* Eval Offer Box - Show the offer that was purchased */}
                {(() => {
                  const isFreeEval = evaluation.price === 0
                  const offerTitle = isFreeEval ? 'Free Evaluation' : (scout?.offer_title || 'Standard Evaluation')
                  const offerDescription = isFreeEval ? scout?.free_eval_description : scout?.bio
                  const offerPrice = evaluation.price || 0

                  return (
                    <div className="border border-gray-200 rounded-lg p-6 mb-6 md:mb-8 hover:border-gray-300 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-black">{offerTitle}</h3>
                        <span className="text-lg font-bold text-black">${offerPrice.toFixed(2)}</span>
                      </div>
                      {offerDescription && (
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {offerDescription}
                        </p>
                      )}
                      <div className="mt-4">
                        <Link
                          href={scout?.id ? `${getProfilePath(scout.id, scout.username)}?tab=offers` : `/profile/${scout?.id || ''}?tab=offers`}
                          className={`block w-full px-6 py-3 rounded-lg font-medium text-sm md:text-base transition-colors text-center ${
                            isFreeEval
                              ? 'bg-gray-200 text-black hover:bg-gray-300'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                          style={!isFreeEval ? { backgroundColor: '#233dff' } : undefined}
                        >
                          {isFreeEval ? 'Request Free Evaluation' : 'Purchase Evaluation'}
                        </Link>
                      </div>
                    </div>
                  )
                })()}

                {/* Scout Profile Card - Second when coming from player's profile or default */}
                <div className="mb-6 md:mb-8">
                  <Link
                    href={scout?.id ? getProfilePath(scout.id, scout.username) : `/profile/${scout?.id || ''}`}
                    className="flex items-center gap-3 md:gap-4 mb-4 hover:opacity-90 transition-opacity"
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
                        <div
                          className={`w-full h-full flex items-center justify-center text-xl md:text-2xl font-semibold text-white ${getGradientForId(
                            scout?.user_id || evaluation.scout_id || scout?.id || evaluation.id
                          )}`}
                        >
                          {scout?.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg md:text-xl font-bold text-black mb-1">
                        {scout?.full_name || 'Unknown Scout'}
                      </h2>
                      {(scout?.position || scout?.organization) && (
                        <p className="text-sm text-gray-600">
                          {scout?.position && scout?.organization
                            ? `${scout.position} at ${scout.organization}`
                            : scout?.position
                            ? scout.position
                            : scout?.organization
                            ? scout.organization
                            : ''}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
              </>
            )}

            {/* Evaluation Notes */}
            {evaluation.notes && (
              <div className="mb-6 md:mb-8">
                <div className="border-b border-gray-200 pb-4 md:pb-6 mb-4 md:mb-6">
                  <p className="text-black leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                    {evaluation.notes}
                  </p>
                </div>
                {/* Share button and View Count - bottom left underneath evaluation (available for all evaluations) */}
                <div className="mt-6 flex items-center gap-4">
                  <ShareButton 
                    evaluationId={evaluation.id} 
                    userId={userId}
                    evaluation={{
                      id: evaluation.id,
                      share_token: evaluation.share_token || null,
                      status: evaluation.status,
                      player_id: evaluation.player_id,
                      scout: evaluation.scout,
                    }}
                  />
                  {/* View Count */}
                  {/* TODO: Re-enable view count display when ready */}
                  {/* {evaluation.view_count !== undefined && evaluation.view_count !== null && (
                    <div className="text-sm text-gray-600">
                      {(evaluation.view_count ?? 0).toLocaleString()} {(evaluation.view_count ?? 0) === 1 ? 'view' : 'views'}
                    </div>
                  )} */}
                </div>
              </div>
            )}
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
        <div className="mb-4 md:mb-6">
          <div></div>
        </div>

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
              <div
                className={`w-full h-full flex items-center justify-center text-3xl font-semibold text-white ${getGradientForId(
                  player?.user_id || evaluation.player_id || player?.id || evaluation.id
                )}`}
              >
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
  // Handle cancelled evaluations first
  if (isScout && evaluation.status === 'cancelled') {
    const player = evaluation.player
    
    return (
      <div className="max-w-4xl mx-auto">
        {/* Header - back button removed */}
        <div className="mb-4 md:mb-6 flex items-center justify-between">
          <div></div>
        </div>

        {/* Cancelled Evaluation Message */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-3 md:mb-4">Evaluation Cancelled</h2>
          <div className="p-4 md:p-6 bg-red-50 rounded-lg border border-red-200">
            <p className="text-black mb-2">
              <strong>{player?.full_name || 'The player'}</strong> has cancelled their evaluation request.
            </p>
            {evaluation.payment_status === 'refunded' && (
              <p className="text-sm text-green-700 mt-2">
                ✅ Payment has been automatically refunded.
              </p>
            )}
            {evaluation.cancelled_reason && (
              <p className="text-black text-sm mt-2">
                <strong>Reason:</strong> {evaluation.cancelled_reason}
              </p>
            )}
            <button
              onClick={() => router.push('/my-evals')}
              className="mt-4 inline-flex items-center justify-center px-4 py-2 bg-black text-white rounded-md text-sm font-semibold hover:bg-gray-900 transition-colors"
            >
              Back to My Evals
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  // If completed, show it like ProfileView. If confirmed/in_progress, show form.
  if (evaluation.status === 'completed' && evaluation.notes) {
    // Completed evaluation - show scout's own profile card and the evaluation
    const scout = scoutProfile || evaluation.scout
    
    return (
      <div className="max-w-4xl mx-auto">
        {/* Header - back button removed */}
        <div className="mb-4 md:mb-6 flex items-center justify-between">
          <div></div>
          {/* More options menu for completed evaluations */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="More options"
            >
              <svg
                className="w-5 h-5 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button
                  onClick={async () => {
                    setDownloading(true)
                    try {
                      const response = await fetch(`/api/evaluation/${evaluation.id}/download-pdf`)
                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                        console.error('PDF download failed:', response.status, errorData)
                        throw new Error(errorData.error || `Failed to download PDF (${response.status})`)
                      }
                      const blob = await response.blob()
                      if (blob.size === 0) {
                        throw new Error('PDF file is empty')
                      }
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `evaluation-${evaluation.id}-${new Date().toISOString().split('T')[0]}.pdf`
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                      setMenuOpen(false)
                    } catch (error: any) {
                      console.error('Error downloading PDF:', error)
                      alert(error?.message || 'Failed to download PDF. Please try again.')
                    } finally {
                      setDownloading(false)
                    }
                  }}
                  disabled={downloading}
                  className="w-full text-left px-4 py-3 text-sm text-black hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {downloading ? 'Downloading...' : 'Download PDF'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Reorder based on fromProfile - Scout view always shows scout first */}
        {fromProfile === 'player' ? (
          <>
            {/* Player Profile Card - First when coming from player's profile */}
            {player && (
              <div className="mb-6 md:mb-8">
                <Link
                  href={player.id ? getProfilePath(player.id, player.username) : `/profile/${player.id || ''}`}
                  className="flex items-start gap-3 md:gap-4 mb-4 hover:opacity-90 transition-opacity"
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0">
                    {isMeaningfulAvatar(player.avatar_url) ? (
                      <Image
                        src={player.avatar_url}
                        alt={player.full_name || 'Player'}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${getGradientForId(
                        player.user_id || evaluation.player_id || player.id || evaluation.id
                      )}`}>
                        <span className="text-white text-xl font-semibold">
                          {player.full_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-black text-base md:text-lg mb-1 truncate">
                      {player.full_name || 'Unknown Player'}
                    </h3>
                    <p className="text-black text-xs md:text-sm mb-1 truncate">
                      {player.school || 'Unknown School'}
                      {player.school && player.graduation_year && ', '}
                      {player.graduation_year && `${player.graduation_year}`}
                    </p>
                    <p className="text-black text-xs md:text-sm text-gray-600">
                      {formatDate(evaluation.created_at)}
                    </p>
                  </div>
                </Link>
              </div>
            )}

            {/* Eval Offer Box */}
            {(() => {
              const isFreeEval = evaluation.price === 0
              const offerTitle = isFreeEval ? 'Free Evaluation' : (scout?.offer_title || 'Standard Evaluation')
              const offerDescription = isFreeEval ? scout?.free_eval_description : scout?.bio
              const offerPrice = evaluation.price || 0

              return (
                <div className="border border-gray-200 rounded-lg p-6 mb-6 md:mb-8 hover:border-gray-300 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-black">{offerTitle}</h3>
                    <span className="text-lg font-bold text-black">${offerPrice.toFixed(2)}</span>
                  </div>
                  {offerDescription && (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {offerDescription}
                    </p>
                  )}
                  <div className="mt-4">
                    <Link
                      href={scout?.id ? `${getProfilePath(scout.id, scout.username)}?tab=offers` : `/profile/${scout?.id || ''}?tab=offers`}
                      className={`block w-full px-6 py-3 rounded-lg font-medium text-sm md:text-base transition-colors text-center ${
                        isFreeEval
                          ? 'bg-gray-200 text-black hover:bg-gray-300'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      style={!isFreeEval ? { backgroundColor: '#233dff' } : undefined}
                    >
                      {isFreeEval ? 'Request Free Evaluation' : 'Purchase Evaluation'}
                    </Link>
                  </div>
                </div>
              )
            })()}

            {/* Scout Profile Card - Second when coming from player's profile */}
            <div className="mb-6 md:mb-8">
              <Link 
                href={scout?.id ? getProfilePath(scout.id, scout.username) : `/profile/${scout?.id || ''}`}
                className="flex items-center gap-3 md:gap-4 mb-4 hover:opacity-90 transition-opacity"
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
                    <div
                      className={`w-full h-full flex items-center justify-center text-xl md:text-2xl font-semibold text-white ${getGradientForId(
                        scout?.user_id || evaluation.scout_id || scout?.id || evaluation.id
                      )}`}
                    >
                      {scout?.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-bold text-black mb-1">
                    {scout?.full_name || 'Unknown Scout'}
                  </h2>
                  {(scout?.position || scout?.organization) && (
                    <p className="text-sm text-gray-600">
                      {scout?.position && scout?.organization
                        ? `${scout.position} at ${scout.organization}`
                        : scout?.position
                        ? scout.position
                        : scout?.organization
                        ? scout.organization
                        : ''}
                    </p>
                  )}
                </div>
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Scout Profile Card - First when coming from scout's profile or default */}
            <div className="mb-6 md:mb-8">
              <Link 
                href={scout?.id ? getProfilePath(scout.id, scout.username) : `/profile/${scout?.id || ''}`}
                className="flex items-center gap-3 md:gap-4 mb-4 hover:opacity-90 transition-opacity"
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
                    <div
                      className={`w-full h-full flex items-center justify-center text-xl md:text-2xl font-semibold text-white ${getGradientForId(
                        scout?.user_id || evaluation.scout_id || scout?.id || evaluation.id
                      )}`}
                    >
                      {scout?.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-bold text-black mb-1">
                    {scout?.full_name || 'Unknown Scout'}
                  </h2>
                  {(scout?.position || scout?.organization) && (
                    <p className="text-sm text-gray-600">
                      {scout?.position && scout?.organization
                        ? `${scout.position} at ${scout.organization}`
                        : scout?.position
                        ? scout.position
                        : scout?.organization
                        ? scout.organization
                        : ''}
                    </p>
                  )}
                </div>
              </Link>
            </div>

            {/* Eval Offer Box */}
            {(() => {
              const isFreeEval = evaluation.price === 0
              const offerTitle = isFreeEval ? 'Free Evaluation' : (scout?.offer_title || 'Standard Evaluation')
              const offerDescription = isFreeEval ? scout?.free_eval_description : scout?.bio
              const offerPrice = evaluation.price || 0

              return (
                <div className="border border-gray-200 rounded-lg p-6 mb-6 md:mb-8 hover:border-gray-300 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-black">{offerTitle}</h3>
                    <span className="text-lg font-bold text-black">${offerPrice.toFixed(2)}</span>
                  </div>
                  {offerDescription && (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {offerDescription}
                    </p>
                  )}
                  <div className="mt-4">
                    <Link
                      href={scout?.id ? `${getProfilePath(scout.id, scout.username)}?tab=offers` : `/profile/${scout?.id || ''}?tab=offers`}
                      className={`block w-full px-6 py-3 rounded-lg font-medium text-sm md:text-base transition-colors text-center ${
                        isFreeEval
                          ? 'bg-gray-200 text-black hover:bg-gray-300'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      style={!isFreeEval ? { backgroundColor: '#233dff' } : undefined}
                    >
                      {isFreeEval ? 'Request Free Evaluation' : 'Purchase Evaluation'}
                    </Link>
                  </div>
                </div>
              )
            })()}

            {/* Player Profile Card - Second when coming from scout's profile or default */}
            {player && (
              <div className="mb-6 md:mb-8">
                <Link
                  href={player.id ? getProfilePath(player.id, player.username) : `/profile/${player.id || ''}`}
                  className="flex items-start gap-3 md:gap-4 mb-4 hover:opacity-90 transition-opacity"
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0">
                    {isMeaningfulAvatar(player.avatar_url) ? (
                      <Image
                        src={player.avatar_url}
                        alt={player.full_name || 'Player'}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${getGradientForId(
                        player.user_id || evaluation.player_id || player.id || evaluation.id
                      )}`}>
                        <span className="text-white text-xl font-semibold">
                          {player.full_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-black text-base md:text-lg mb-1 truncate">
                      {player.full_name || 'Unknown Player'}
                    </h3>
                    <p className="text-black text-xs md:text-sm mb-1 truncate">
                      {player.school || 'Unknown School'}
                      {player.school && player.graduation_year && ', '}
                      {player.graduation_year && `${player.graduation_year}`}
                    </p>
                    <p className="text-black text-xs md:text-sm text-gray-600">
                      {formatDate(evaluation.created_at)}
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </>
        )}

        {/* Evaluation Notes */}
        {evaluation.notes && (
          <div className="mb-6 md:mb-8">
            <div className="border-b border-gray-200 pb-4 md:pb-6 mb-4 md:mb-6">
              <p className="text-black leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                {evaluation.notes}
              </p>
            </div>
            {/* Share button and View Count - bottom left underneath evaluation (available for all evaluations) */}
            <div className="mt-6 flex items-center gap-4">
              <ShareButton 
                evaluationId={evaluation.id} 
                userId={userId}
                evaluation={{
                  id: evaluation.id,
                  share_token: evaluation.share_token || null,
                  status: evaluation.status,
                  player_id: evaluation.player_id,
                  scout: scout || evaluation.scout,
                }}
              />
              {/* View Count */}
              {/* TODO: Re-enable view count display when ready */}
              {/* {evaluation.view_count !== undefined && evaluation.view_count !== null && (
                <div className="text-sm text-gray-600">
                  {(evaluation.view_count ?? 0).toLocaleString()} {(evaluation.view_count ?? 0) === 1 ? 'view' : 'views'}
                </div>
              )} */}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Pending/In Progress - show evaluation form
  return (
    <div className="max-w-4xl mx-auto">
      {/* Compact Player Info Section */}
      <div className="mb-4">
        <div className="flex items-start gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            {isMeaningfulAvatar(player?.avatar_url) ? (
              <Image
                src={player.avatar_url}
                alt={player.full_name || 'Player'}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center text-base font-semibold text-white ${getGradientForId(
                  player?.user_id || evaluation.player_id || player?.id || evaluation.id
                )}`}
              >
                {player?.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-black truncate mb-0.5">
              {player?.full_name || 'Unknown Player'}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-600">
              {player?.position && <span>{player.position}</span>}
              {player?.school && <span>• {player.school}</span>}
              {player?.state && <span>• {player.state}</span>}
              {player?.classification && <span>• {player.classification}</span>}
              {player?.graduation_year && <span>• Class of {player.graduation_year}</span>}
            </div>
          </div>
        </div>
        
        {/* Compact Athletic Info Grid */}
        {(() => {
          const fortyTime = player?.forty_yard_dash || player?.forty_yd_dash
          const hasAnyData = player?.height || player?.weight || fortyTime || player?.gpa || player?.bench_max || player?.squat_max || player?.clean_max || player?.hudl_link || player?.college_offers
          return hasAnyData ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
              <div className="grid grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-1.5 text-xs">
                {player?.height && (
                  <div>
                    <span className="text-gray-500">Height:</span>{' '}
                    <span className="text-black font-medium">{player.height}</span>
                  </div>
                )}
                {player?.weight && (
                  <div>
                    <span className="text-gray-500">Weight:</span>{' '}
                    <span className="text-black font-medium">{player.weight} lbs</span>
                  </div>
                )}
                {fortyTime && (
                  <div>
                    <span className="text-gray-500">40yd:</span>{' '}
                    <span className="text-black font-medium">{typeof fortyTime === 'number' ? fortyTime.toFixed(2) : fortyTime}s</span>
                  </div>
                )}
                {player?.gpa && (
                  <div>
                    <span className="text-gray-500">GPA:</span>{' '}
                    <span className="text-black font-medium">{player.gpa}</span>
                  </div>
                )}
                {player?.bench_max && (
                  <div>
                    <span className="text-gray-500">Bench:</span>{' '}
                    <span className="text-black font-medium">{player.bench_max} lbs</span>
                  </div>
                )}
                {player?.squat_max && (
                  <div>
                    <span className="text-gray-500">Squat:</span>{' '}
                    <span className="text-black font-medium">{player.squat_max} lbs</span>
                  </div>
                )}
                {player?.clean_max && (
                  <div>
                    <span className="text-gray-500">Clean:</span>{' '}
                    <span className="text-black font-medium">{player.clean_max} lbs</span>
                  </div>
                )}
                {player?.hudl_link && (
                  <div className="col-span-3 md:col-span-1">
                    <a
                      href={player.hudl_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium text-xs"
                    >
                      View Hudl →
                    </a>
                  </div>
                )}
                {player?.college_offers && (
                  <div className="col-span-3 md:col-span-4 mt-1.5 pt-1.5 border-t border-gray-300">
                    <span className="text-gray-500">College Offers:</span>{' '}
                    <span className="text-black font-medium">{player.college_offers}</span>
                  </div>
                )}
              </div>
            </div>
          ) : null
        })()}
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

      {/* Cancel Button - Only show for scouts on free in_progress evaluations */}
      {isScout && isFreeEval && evaluation.status === 'in_progress' && (
        <button
          onClick={handleCancelEvaluation}
          disabled={cancelling || submitting}
          className="w-full mt-3 px-4 md:px-6 py-3 md:py-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm md:text-lg transition-colors"
        >
          {cancelling ? 'Cancelling...' : 'Cancel'}
        </button>
      )}
    </div>
  )
}

