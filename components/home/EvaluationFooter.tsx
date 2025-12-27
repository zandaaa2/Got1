'use client'

import { useState, useEffect } from 'react'
import EvaluationCommentsSection from './EvaluationCommentsSection'

interface EvaluationFooterProps {
  evaluationId: string
}

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

export default function EvaluationFooter({ evaluationId }: EvaluationFooterProps) {
  const [likes, setLikes] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [comments, setComments] = useState(0)
  const [showComments, setShowComments] = useState(false)

  // Fetch like count, comment count, and status on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch like count and status
        const likeResponse = await fetch(`/api/likes?likeableType=evaluation&likeableId=${evaluationId}`)
        if (likeResponse.ok) {
          const likeData = await likeResponse.json()
          setLikes(likeData.likeCount || 0)
          setIsLiked(likeData.isLiked || false)
        }

        // Fetch comment count
        const commentResponse = await fetch(`/api/evaluation/${evaluationId}/comments`)
        if (commentResponse.ok) {
          const commentData = await commentResponse.json()
          setComments(commentData.comments?.length || 0)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData()
  }, [evaluationId])

  const handleCommentAdded = () => {
    // Refresh comment count when a new comment is added
    fetch(`/api/evaluation/${evaluationId}/comments`)
      .then(res => res.json())
      .then(data => {
        setComments(data.comments?.length || 0)
      })
      .catch(console.error)
  }

  const handleLike = async () => {
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          likeableType: 'evaluation',
          likeableId: evaluationId,
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
    const evalUrl = `${window.location.origin}/evaluations/${evaluationId}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this evaluation',
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
      const response = await fetch(`/api/evaluation/${evaluationId}/download-pdf`)
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to download PDF' }))
        throw new Error(error.error || 'Failed to download PDF')
      }

      // Server generated PDF - download directly
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `evaluation-${evaluationId}.pdf`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Error downloading PDF:', err)
      alert(err.message || 'Failed to download evaluation PDF')
    }
  }

  return (
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
          onClick={() => setShowComments(!showComments)}
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

      {/* Comments Section */}
      {showComments && (
        <EvaluationCommentsSection evaluationId={evaluationId} onCommentAdded={handleCommentAdded} />
      )}
    </div>
  )
}
