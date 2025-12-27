'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getGradientForId } from '@/lib/gradients'

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

interface BlogCommentsSectionProps {
  blogId: string
  onCommentAdded?: () => void
}

export default function BlogCommentsSection({ blogId, onCommentAdded }: BlogCommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [commentText, setCommentText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadComments()
  }, [blogId])

  const loadComments = async () => {
    try {
      setLoading(true)
      const { data: commentsData, error } = await supabase
        .from('blog_comments')
        .select('*')
        .eq('blog_post_id', blogId)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (commentsData) {
        // Fetch profile data for each comment
        const commentsWithProfiles = await Promise.all(
          commentsData.map(async (comment) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, user_id, username, full_name, avatar_url, organization, school, position')
              .eq('user_id', comment.user_id)
              .maybeSingle()

            return {
              ...comment,
              profile: profile || null,
            } as Comment
          })
        )
        setComments(commentsWithProfiles)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!commentText.trim()) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/auth/signin'
      return
    }

    setSubmitting(true)
    try {
      const { data: newComment, error } = await supabase
        .from('blog_comments')
        .insert([{
          blog_post_id: blogId,
          user_id: session.user.id,
          content: commentText.trim(),
        }])
        .select('*')
        .single()

      if (error) throw error

      // Fetch profile for the new comment
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, user_id, username, full_name, avatar_url, organization, school, position')
        .eq('user_id', session.user.id)
        .maybeSingle()

      const commentWithProfile = {
        ...newComment,
        profile: profile || null,
      } as Comment

      setComments(prev => [commentWithProfile, ...prev])
      setCommentText('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      onCommentAdded?.()
    } catch (error) {
      console.error('Error submitting comment:', error)
      alert('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [commentText])

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setCurrentUserId(session?.user?.id || null)
    }
    getSession()
  }, [supabase])

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      {/* Comment Input */}
      {currentUserId ? (
        <div className="mb-4">
          <textarea
            ref={textareaRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 text-sm"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              disabled={!commentText.trim() || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 text-center py-4 border border-gray-200 rounded-lg">
          <p className="text-gray-600 mb-2 text-sm">Sign in to comment</p>
          <Link
            href="/auth/signin"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Sign In
          </Link>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-4 text-gray-500 text-sm">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">No comments yet</div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const profile = comment.profile
            const profilePath = profile?.username 
              ? `/${profile.username}` 
              : `/profile/${profile?.id || ''}`
            const avatarUrl = profile?.avatar_url && isMeaningfulAvatar(profile.avatar_url) 
              ? profile.avatar_url 
              : null
            const gradientClass = getGradientForId(profile?.user_id || comment.user_id || 'user')
            const initial = profile?.full_name?.charAt(0).toUpperCase() || 'U'

            return (
              <div key={comment.id} className="flex gap-3">
                {profile ? (
                  <Link href={profilePath} className="flex-shrink-0">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={profile.full_name || 'User'}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${gradientClass}`}>
                        {initial}
                      </div>
                    )}
                  </Link>
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${gradientClass}`}>
                    {initial}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {profile ? (
                      <Link href={profilePath} className="font-medium text-sm text-black hover:underline">
                        {profile.full_name || profile.username || 'Anonymous'}
                      </Link>
                    ) : (
                      <span className="font-medium text-sm text-black">Anonymous</span>
                    )}
                    <span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span>
                  </div>
                  <p className="text-gray-900 text-sm whitespace-pre-wrap break-words">{comment.content}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

