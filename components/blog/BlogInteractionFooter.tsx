'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

interface BlogInteractionFooterProps {
  blogId: string
  userId: string | null
  slug: string
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  profile: {
    full_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

export default function BlogInteractionFooter({ blogId, userId, slug }: BlogInteractionFooterProps) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [comments, setComments] = useState<Comment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadInteractions()
  }, [blogId, userId])

  const loadInteractions = async () => {
    try {
      // Load likes using unified API
      const likeResponse = await fetch(`/api/likes?likeableType=blog_post&likeableId=${blogId}`)
      if (likeResponse.ok) {
        const likeData = await likeResponse.json()
        setLikeCount(likeData.likeCount || 0)
        setLiked(likeData.isLiked || false)
      }

      // Load comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('blog_comments')
        .select('*')
        .eq('blog_post_id', blogId)
        .order('created_at', { ascending: false })

      if (!commentsError && commentsData) {
        // Fetch profile data for each comment
        const commentsWithProfiles = await Promise.all(
          commentsData.map(async (comment) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, username, avatar_url')
              .eq('user_id', comment.user_id)
              .single()

            return {
              ...comment,
              profile: profile || null,
            } as Comment
          })
        )
        setComments(commentsWithProfiles)
      }
    } catch (error) {
      console.error('Error loading interactions:', error)
    } finally {
      setLoading(false)
    }
  }

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
          likeableType: 'blog_post',
          likeableId: blogId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setLiked(data.liked || false)
        setLikeCount(data.likeCount || 0)
      } else {
        console.error('Error toggling like:', await response.json())
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleComment = async () => {
    if (!userId) {
      router.push('/auth/signin')
      return
    }

    if (!newComment.trim()) return

    setSubmittingComment(true)
    try {
      const { data, error } = await supabase
        .from('blog_comments')
        .insert([{
          blog_post_id: blogId,
          user_id: userId,
          content: newComment.trim(),
        }])
        .select('*')
        .single()

      if (error) throw error

      // Fetch profile for the new comment
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('user_id', userId)
        .single()

      const newCommentWithProfile = {
        ...data,
        profile: profile || null,
      } as Comment

      setComments(prev => [newCommentWithProfile, ...prev])
      setNewComment('')

      // Create notification for blog post author
      try {
        // Get the blog post to find the author
        const { data: blogPost } = await supabase
          .from('blog_posts')
          .select('scout_id, author_email, slug')
          .eq('id', blogId)
          .maybeSingle()

        if (blogPost) {
          // Get the author's user_id (from scout_id or by email)
          let authorUserId: string | null = blogPost.scout_id
          
          if (!authorUserId && blogPost.author_email) {
            const { data: authorProfile } = await supabase
              .from('profiles')
              .select('user_id')
              .eq('email', blogPost.author_email)
              .maybeSingle()
            authorUserId = authorProfile?.user_id || null
          }

          // Only notify if not commenting on own post
          if (authorUserId && authorUserId !== userId) {
            const commenterName = profile?.full_name || profile?.username || 'Someone'
            
            await fetch('/api/notifications/create-for-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                targetUserId: authorUserId,
                type: 'blog_post_commented',
                title: 'New Comment',
                message: `${commenterName} commented on your blog post`,
                link: blogPost.slug ? `/blog/${blogPost.slug}` : `/blog`,
                metadata: { blog_post_id: blogId, commenter_id: userId, comment_id: data.id },
              }),
            })
          }
        }
      } catch (notifError) {
        // Don't fail the comment if notification creation fails
        console.error('Error creating comment notification:', notifError)
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
      alert('Failed to post comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/blog/${slug}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this blog post on Got1',
          url,
        })
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback to copy
      try {
        await navigator.clipboard.writeText(url)
        alert('Link copied to clipboard!')
      } catch (error) {
        console.error('Failed to copy:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
        <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="pt-4 border-t border-gray-200">
      {/* Interaction Buttons */}
      <div className="flex items-center gap-6 mb-4">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            liked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
          }`}
        >
          <svg
            className={`w-5 h-5 ${liked ? 'fill-current' : ''}`}
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
          {likeCount > 0 && <span>{likeCount}</span>}
          <span className="hidden sm:inline">Like</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
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
          {comments.length > 0 && <span>{comments.length}</span>}
          <span className="hidden sm:inline">Comment</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
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
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 space-y-4">
          {/* Comment Input */}
          {userId ? (
            <div className="flex gap-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
              />
              <button
                onClick={handleComment}
                disabled={!newComment.trim() || submittingComment}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed self-end"
              >
                {submittingComment ? 'Posting...' : 'Post'}
              </button>
            </div>
          ) : (
            <div className="text-center py-4 border border-gray-200 rounded-lg">
              <p className="text-gray-600 mb-2">Sign in to comment</p>
              <button
                onClick={() => router.push('/auth/signin')}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Comments List */}
          {comments.length > 0 && (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                    {comment.profile?.avatar_url ? (
                      <img
                        src={comment.profile.avatar_url}
                        alt={comment.profile.full_name || 'User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-600 text-sm font-medium">
                        {(comment.profile?.full_name || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-black">
                        {comment.profile?.full_name || comment.profile?.username || 'Anonymous'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-gray-900 text-sm whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

