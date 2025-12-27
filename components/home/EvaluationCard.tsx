'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import InlineFollowButton from '@/components/shared/InlineFollowButton'

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface EvaluationCardProps {
  evaluation: {
    id: string
    scout_id: string
    player_id: string
    status: string
    notes: string
    completed_at: string
    created_at: string
    scout: {
      id: string
      user_id: string
      username: string | null
      full_name: string | null
      avatar_url: string | null
      organization: string | null
      position: string | null
    } | null
    player: {
      id: string
      user_id: string
      username: string | null
      full_name: string | null
      avatar_url: string | null
      school: string | null
      position: string | null
      graduation_year: number | null
    } | null
  }
}

export default function EvaluationCard({ evaluation }: EvaluationCardProps) {
  const [likes, setLikes] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [comments, setComments] = useState(0)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  
  const scout = evaluation.scout
  const player = evaluation.player
  const scoutPath = scout?.username 
    ? `/${scout.username}` 
    : `/profile/${scout?.id || ''}`
  const playerPath = player?.username 
    ? `/${player.username}` 
    : `/profile/${player?.id || ''}`

  // Fetch like count and status on mount
  useEffect(() => {
    const fetchLikes = async () => {
      try {
        const response = await fetch(`/api/likes?likeableType=evaluation&likeableId=${evaluation.id}`)
        if (response.ok) {
          const data = await response.json()
          setLikes(data.likeCount || 0)
          setIsLiked(data.isLiked || false)
        }
      } catch (error) {
        console.error('Error fetching likes:', error)
      }
    }
    fetchLikes()
  }, [evaluation.id])

  const handleLike = async () => {
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          likeableType: 'evaluation',
          likeableId: evaluation.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setLikes(data.likeCount || 0)
        setIsLiked(data.liked || false)
      } else {
        // If unauthorized, redirect to sign in
        if (response.status === 401) {
          window.location.href = '/auth/signin'
        } else {
          console.error('Error liking evaluation:', await response.json())
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleShare = async () => {
    const evalUrl = `${window.location.origin}/evaluations/${evaluation.id}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Evaluation by ${scout?.full_name || 'Scout'}`,
          text: 'Check out this evaluation',
          url: evalUrl,
        })
      } else {
        await navigator.clipboard.writeText(evalUrl)
        alert('Evaluation link copied to clipboard!')
      }
    } catch (err) {
      console.log('Share cancelled or failed')
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/evaluation/${evaluation.id}/download-pdf`)
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to download PDF' }))
        throw new Error(error.error || 'Failed to download PDF')
      }

      // Server generated PDF - download directly
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `evaluation-${evaluation.id}.pdf`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Error downloading PDF:', err)
      alert(err.message || 'Failed to download evaluation PDF')
    }
  }

  const getGradientForId = (id: string) => {
    const colors = [
      'bg-gradient-to-br from-blue-400 to-blue-600',
      'bg-gradient-to-br from-purple-400 to-purple-600',
      'bg-gradient-to-br from-pink-400 to-pink-600',
      'bg-gradient-to-br from-red-400 to-red-600',
      'bg-gradient-to-br from-orange-400 to-orange-600',
      'bg-gradient-to-br from-yellow-400 to-yellow-600',
      'bg-gradient-to-br from-green-400 to-green-600',
      'bg-gradient-to-br from-teal-400 to-teal-600',
    ]
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[index % colors.length]
  }

  const isMeaningfulAvatar = (url: string | null | undefined) => {
    return url && !url.includes('ui-avatars.com') && url.trim() !== ''
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Evaluation Completed</span>
          <span>•</span>
          <span>{formatTimeAgo(evaluation.completed_at || evaluation.created_at)}</span>
        </div>
        {/* More Options Button */}
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          aria-label="More options"
        >
          <svg
            className="w-5 h-5"
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
        {/* More Options Menu */}
        {showMoreMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMoreMenu(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              <button
                onClick={() => {
                  setShowMoreMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Report evaluation
              </button>
            </div>
          </>
        )}
      </div>

      {/* Scout and Player */}
      <div className="flex items-start gap-1.5 md:gap-4 mb-4 overflow-hidden">
        {/* Scout */}
        {scout && (
          <Link href={scoutPath} className="flex items-center gap-1 md:gap-2 hover:opacity-80 transition-opacity flex-shrink-0 max-w-[40%] md:max-w-none">
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-full overflow-hidden flex-shrink-0">
              {isMeaningfulAvatar(scout.avatar_url) ? (
                <Image
                  src={scout.avatar_url}
                  alt={scout.full_name || 'Scout'}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${getGradientForId(scout.id)}`}>
                  <span className="text-white text-xs md:text-lg font-semibold">
                    {scout.full_name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-semibold text-xs md:text-base text-black truncate">{scout.full_name || 'Scout'}</h4>
                {scout.user_id && (
                  <InlineFollowButton userId={scout.user_id} className="text-[10px] px-1.5 py-0" />
                )}
              </div>
              <p className="text-[10px] md:text-sm text-gray-600 truncate">
                {scout.organization || scout.position || ''}
              </p>
            </div>
          </Link>
        )}

        {/* Arrow */}
        <div className="text-gray-400 self-center flex-shrink-0 text-xs md:text-base px-0.5 md:px-2">→</div>

        {/* Player */}
        {player && (
          <Link href={playerPath} className="flex items-center gap-1 md:gap-2 hover:opacity-80 transition-opacity min-w-0 flex-1">
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-full overflow-hidden flex-shrink-0">
              {isMeaningfulAvatar(player.avatar_url) ? (
                <Image
                  src={player.avatar_url}
                  alt={player.full_name || 'Player'}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${getGradientForId(player.id)}`}>
                  <span className="text-white text-xs md:text-lg font-semibold">
                    {player.full_name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-semibold text-xs md:text-base text-black truncate">{player.full_name || 'Player'}</h4>
                {player.user_id && (
                  <InlineFollowButton userId={player.user_id} className="text-[10px] px-1.5 py-0" />
                )}
              </div>
              <p className="text-[10px] md:text-sm text-gray-600 truncate">
                {player.school || player.position || ''}
                {player.graduation_year ? ` • ${player.graduation_year}` : ''}
              </p>
            </div>
          </Link>
        )}
      </div>

      {/* Evaluation Notes Preview */}
      {evaluation.notes && (
        <div className="mb-4">
          <p className="text-gray-900 whitespace-pre-wrap break-words line-clamp-5">
            {evaluation.notes}
          </p>
          <Link
            href={`/evaluations/${evaluation.id}`}
            className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            see more...
          </Link>
        </div>
      )}

      {/* Footer Row: Likes/Comments on left, Share/Download on right */}
      <div className="flex items-center justify-between pt-3">
        {/* Left side: Likes and Comments */}
        <div className="flex items-center gap-4">
          {/* Like button */}
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 text-gray-600 hover:text-red-600 transition-colors"
          >
            <svg
              className={`w-5 h-5 ${isLiked ? 'fill-red-600 text-red-600' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span className="text-sm font-medium">{likes}</span>
          </button>

          {/* Comment button */}
          <button
            onClick={() => {}}
            className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="text-sm font-medium">{comments}</span>
          </button>
        </div>

        {/* Right side: Share and Download icons */}
        <div className="flex items-center gap-3">
          {/* Share button */}
          <button
            onClick={handleShare}
            className="p-1.5 text-gray-600 hover:text-blue-600 transition-colors rounded-full hover:bg-gray-100"
            title="Share evaluation"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </button>

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="p-1.5 text-gray-600 hover:text-blue-600 transition-colors rounded-full hover:bg-gray-100"
            title="Download PDF"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
