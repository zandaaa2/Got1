'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'

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

interface Comment {
  id: string
  user_id: string
  content: string
  created_at: string
  profile: {
    id: string
    user_id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
    organization?: string | null
    school?: string | null
    position?: string | null
  } | null
}

interface CommentsSectionProps {
  postId: string
  onCommentAdded?: () => void
}

export default function CommentsSection({ postId, onCommentAdded }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [commentText, setCommentText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

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

  useEffect(() => {
    fetchComments()
  }, [postId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/posts/${postId}/comments`)
      if (!response.ok) {
        throw new Error('Failed to fetch comments')
      }
      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || submitting) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: commentText.trim() }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create comment' }))
        throw new Error(error.error || 'Failed to create comment')
      }

      const data = await response.json()
      
      // Add the new comment to the list
      setComments(prev => [...prev, data.comment])
      
      // Clear the input
      setCommentText('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }

      // Notify parent component
      if (onCommentAdded) {
        onCommentAdded()
      }
    } catch (error: any) {
      console.error('Error creating comment:', error)
      alert(error.message || 'Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommentText(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  if (loading) {
    return (
      <div className="border-t border-gray-200 pt-4 mt-4">
        <p className="text-sm text-gray-500 text-center">Loading comments...</p>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={handleTextareaChange}
              placeholder="Write a comment..."
              rows={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!commentText.trim() || submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => {
            const profile = comment.profile
            const profilePath = profile?.username 
              ? `/${profile.username}` 
              : `/profile/${profile?.id || ''}`

            return (
              <div key={comment.id} className="flex gap-3">
                <Link href={profilePath} className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    {profile && profile.avatar_url && isMeaningfulAvatar(profile.avatar_url) ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.full_name || 'User'}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${getGradientForId(comment.user_id)}`}>
                        <span className="text-white text-xs font-semibold">
                          {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={profilePath} className="hover:opacity-80 transition-opacity">
                      <span className="text-sm font-semibold text-black">
                        {profile?.full_name || 'Anonymous'}
                      </span>
                    </Link>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
