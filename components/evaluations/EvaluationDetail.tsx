'use client'

import Image from 'next/image'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface EvaluationDetailProps {
  evaluation: any
  isScout: boolean
  userId: string
  scoutProfile?: any // Optional scout profile for displaying scout's own profile card
}

export default function EvaluationDetail({
  evaluation,
  isScout,
  userId,
  scoutProfile,
}: EvaluationDetailProps) {
  const [notes, setNotes] = useState(evaluation.notes || '')
  const [submitting, setSubmitting] = useState(false)
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
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-black hover:opacity-70"
        >
          <svg
            className="w-6 h-6"
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
        </button>

        {evaluation.status === 'pending' || evaluation.status === 'in_progress' ? (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">Evaluation Pending</h2>
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-black">
                Your evaluation is {evaluation.status === 'pending' ? 'pending' : 'in progress'}. 
                The scout will complete it soon.
              </p>
            </div>
          </div>
        ) : evaluation.notes ? (
          <div className="mb-8">
            <div className="border-b border-gray-200 pb-6 mb-6">
              <Link
                href={`/profile/${scout?.id || ''}`}
                className="flex items-start gap-4 mb-4 hover:opacity-90 transition-opacity"
              >
                <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {scout?.avatar_url ? (
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
                <div className="flex-1">
                  <h3 className="font-bold text-black text-lg mb-1">
                    {scout?.full_name || 'Unknown Scout'}
                  </h3>
                  <p className="text-black text-sm mb-1">
                    {scout?.position && scout?.organization
                      ? `${scout.position} at ${scout.organization}`
                      : scout?.position
                      ? scout.position
                      : scout?.organization
                      ? scout.organization
                      : 'Scout'}
                  </p>
                  <p className="text-black text-sm text-gray-600">
                    {formatDate(evaluation.created_at)}
                  </p>
                </div>
              </Link>
              {evaluation.notes && (
                <div className="pl-20">
                  <p className="text-black leading-relaxed whitespace-pre-wrap">
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
  // If completed, show it like ProfileView. If pending/in_progress, show form.
  if (evaluation.status === 'completed' && evaluation.notes) {
    // Completed evaluation - show scout's own profile card and the evaluation
    const scout = scoutProfile || evaluation.scout
    
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-black hover:opacity-70"
        >
          <svg
            className="w-6 h-6"
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
        </button>

        {/* Scout Profile Section - matches ProfileView exactly */}
        <Link 
          href={`/profile/${scout?.id || ''}`}
          className="flex items-start gap-6 mb-8 hover:opacity-90 transition-opacity"
        >
          <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {scout?.avatar_url ? (
              <Image
                src={scout.avatar_url}
                alt={scout.full_name || 'Scout'}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 text-3xl font-semibold">
                  {scout?.full_name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-black mb-2">
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
        <div className="mb-8">
          <div className="border-b border-gray-200 pb-6 mb-6">
            <Link
              href={`/profile/${player?.id || ''}`}
              className="flex items-start gap-4 mb-4 hover:opacity-90 transition-opacity"
            >
              <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {player?.avatar_url ? (
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
              <div className="flex-1">
                <h3 className="font-bold text-black text-lg mb-1">
                  {player?.full_name || 'Unknown Player'}
                </h3>
                <p className="text-black text-sm mb-1">
                  {player?.school || 'Unknown School'}
                  {player?.school && player?.graduation_year && ', '}
                  {player?.graduation_year && `${player.graduation_year}`}
                </p>
                <p className="text-black text-sm text-gray-600">
                  {formatDate(evaluation.created_at)}
                </p>
              </div>
            </Link>
            {evaluation.notes && (
              <div className="pl-20">
                <p className="text-black leading-relaxed whitespace-pre-wrap">
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
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-black hover:opacity-70"
      >
        <svg
          className="w-6 h-6"
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
      </button>

      {/* Player Profile Section */}
      <div className="flex items-start gap-6 mb-8">
        <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {player?.avatar_url ? (
            <Image
              src={player.avatar_url}
              alt={player.full_name || 'Player'}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 text-3xl font-semibold">
                {player?.full_name?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-black mb-2">
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-black">Evaluate</h2>
          <div className="text-sm">
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
          className="w-full min-h-[500px] p-4 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black text-lg leading-relaxed resize-none"
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
        />
        <div className="mt-2 text-sm text-gray-600">
          <p>Note: Trailing spaces are not counted toward the character minimum.</p>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmitEvaluation}
        disabled={submitting || !isValid}
        className="w-full mt-8 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg transition-colors"
      >
        {submitting ? 'Submitting...' : isValid ? 'Submit my evaluation' : `Write ${MIN_CHARACTERS - trimmedCount} more characters to submit`}
      </button>
    </div>
  )
}

