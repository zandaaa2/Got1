'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CommentsSection from '@/components/home/CommentsSection'

interface PostInteractionsProps {
  postId: string
  userId: string | null
}

export default function PostInteractions({ postId, userId }: PostInteractionsProps) {
  const [likes, setLikes] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [comments, setComments] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const router = useRouter()

  // Fetch comment count and like count on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch comment count
        const commentResponse = await fetch(`/api/posts/${postId}/comments/count`)
        if (commentResponse.ok) {
          const commentData = await commentResponse.json()
          setComments(commentData.count || 0)
        }

        // Fetch like count and status using unified API
        const likeResponse = await fetch(`/api/likes?likeableType=post&likeableId=${postId}`)
        if (likeResponse.ok) {
          const likeData = await likeResponse.json()
          setLikes(likeData.likeCount || 0)
          setIsLiked(likeData.isLiked || false)
        }
      } catch (error) {
        console.error('Error fetching post data:', error)
      }
    }
    fetchData()
  }, [postId])

  const handleLike = async () => {
    if (!userId) {
      router.push('/auth/signin')
      return
    }

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          likeableType: 'post',
          likeableId: postId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setLikes(data.likeCount || 0)
        setIsLiked(data.liked || false)
      } else {
        if (response.status === 401) {
          router.push('/auth/signin')
        } else {
          console.error('Error liking post:', await response.json())
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleCommentClick = () => {
    setShowComments(!showComments)
  }

  const handleCommentAdded = async () => {
    // Refresh comment count
    try {
      const response = await fetch(`/api/posts/${postId}/comments/count`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.count || 0)
      }
    } catch (error) {
      console.error('Error fetching comment count:', error)
    }
  }

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/posts/${postId}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this post',
          text: 'Check out this post on Got1',
          url: postUrl,
        })
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(postUrl)
        alert('Post link copied to clipboard!')
      }
    } catch (err) {
      // User cancelled share or error occurred
      console.log('Share cancelled or failed')
    }
  }

  return (
    <>
      {/* Footer Row: Likes/Comments on left, Share on right */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 mt-4">
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
            onClick={handleCommentClick}
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

        {/* Right side: Share icon */}
        <div className="flex items-center gap-3">
          {/* Share button */}
          <button
            onClick={handleShare}
            className="p-1.5 text-gray-600 hover:text-blue-600 transition-colors rounded-full hover:bg-gray-100"
            title="Share post"
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
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <CommentsSection postId={postId} onCommentAdded={handleCommentAdded} />
      )}
    </>
  )
}

