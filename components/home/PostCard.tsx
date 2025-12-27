'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import InlineFollowButton from '@/components/shared/InlineFollowButton'
import CommentsSection from './CommentsSection'

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

interface PostCardProps {
  post: {
    id: string
    user_id: string
    content: string
    image_url?: string | null
    video_url?: string | null
    video_thumbnail_url?: string | null
    created_at: string
    pinned?: boolean
    profiles: {
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
  onPinToggle?: () => void
}

export default function PostCard({ post, onPinToggle }: PostCardProps) {
  const [likes, setLikes] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [comments, setComments] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isOwnPost, setIsOwnPost] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pinned, setPinned] = useState(post.pinned || false)
  const [isTogglingPin, setIsTogglingPin] = useState(false)
  const supabase = createClient()
  
  const profile = post.profiles
  const profilePath = profile?.username 
    ? `/${profile.username}` 
    : `/profile/${profile?.id || ''}`
  
  // Check if current user owns this post
  useEffect(() => {
    const checkOwnership = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && session.user.id === post.user_id) {
        setIsOwnPost(true)
      }
    }
    checkOwnership()
  }, [post.user_id, supabase])

  // Fetch comment count and like count on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch comment count
        const commentResponse = await fetch(`/api/posts/${post.id}/comments/count`)
        if (commentResponse.ok) {
          const commentData = await commentResponse.json()
          setComments(commentData.count || 0)
        }

        // Fetch like count and status using unified API
        const likeResponse = await fetch(`/api/likes?likeableType=post&likeableId=${post.id}`)
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
  }, [post.id])

  const handleLike = async () => {
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          likeableType: 'post',
          likeableId: post.id,
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
      const response = await fetch(`/api/posts/${post.id}/comments/count`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.count || 0)
      }
    } catch (error) {
      console.error('Error fetching comment count:', error)
    }
  }

  const handleEdit = () => {
    setEditContent(post.content)
    setIsEditing(true)
    setShowMoreMenu(false)
  }

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent.trim() }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update post' }))
        throw new Error(error.error || 'Failed to update post')
      }

      const data = await response.json()
      // Update the post content in the UI
      post.content = data.post.content
      setIsEditing(false)
      
      // Refresh the page to show updated content
      window.location.reload()
    } catch (error: any) {
      console.error('Error updating post:', error)
      alert(error.message || 'Failed to update post')
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent(post.content)
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete post' }))
        throw new Error(error.error || 'Failed to delete post')
      }

      // Remove the post from the UI
      setShowDeleteConfirm(false)
      // Refresh the page to remove the deleted post
      window.location.reload()
    } catch (error: any) {
      console.error('Error deleting post:', error)
      alert(error.message || 'Failed to delete post')
      setIsDeleting(false)
    }
  }

  const handleTogglePin = async () => {
    if (!isOwnPost) return
    
    setIsTogglingPin(true)
    try {
      const response = await fetch(`/api/posts/${post.id}/pin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pinned: !pinned }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to toggle pin' }))
        throw new Error(error.error || 'Failed to toggle pin')
      }

      setPinned(!pinned)
      setShowMoreMenu(false)
      if (onPinToggle) {
        onPinToggle()
      } else {
        // Refresh the page to show updated order
        window.location.reload()
      }
    } catch (error: any) {
      console.error('Error toggling pin:', error)
      alert(error.message || 'Failed to toggle pin')
    } finally {
      setIsTogglingPin(false)
    }
  }

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/home`
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post by ${profile?.full_name || 'User'}`,
          text: post.content || 'Check out this post',
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
      {/* Pinned Indicator */}
      {pinned && (
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
          <span>Pinned to profile</span>
        </div>
      )}
      {/* Author Header */}
      <div className="flex items-center gap-3 mb-4 relative">
        <Link href={profilePath} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            {isMeaningfulAvatar(profile?.avatar_url) ? (
              <Image
                src={profile.avatar_url!}
                alt={profile?.full_name || 'User'}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${getGradientForId(post.user_id)}`}>
                <span className="text-white text-sm font-semibold">
                  {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={profilePath} className="hover:opacity-80 transition-opacity min-w-0">
              <h3 className="font-semibold text-black truncate">
                {profile?.full_name || 'Anonymous'}
              </h3>
            </Link>
            {profile?.user_id && (
              <InlineFollowButton userId={profile.user_id} />
            )}
          </div>
          <Link href={profilePath} className="block hover:opacity-80 transition-opacity">
            <p className="text-sm text-gray-600 truncate">
              {profile?.organization || profile?.school || profile?.position || ''}
            </p>
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500">
            {formatTimeAgo(post.created_at)}
          </span>
          {/* More Options Button */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
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
                {isOwnPost ? (
                  <>
                    <button
                      onClick={handleTogglePin}
                      disabled={isTogglingPin}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {isTogglingPin ? 'Updating...' : pinned ? 'Unpin from profile' : 'Pin to profile'}
                    </button>
                    <button
                      onClick={handleEdit}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Edit post
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(true)
                        setShowMoreMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete post
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      // Add report functionality here
                      setShowMoreMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Report post
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="mb-4">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
            rows={4}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        post.content && (
          <div className="mb-4">
            <p className="text-gray-900 whitespace-pre-wrap break-words">{post.content}</p>
          </div>
        )
      )}

      {/* Media */}
      {post.image_url && (
        <div className="mb-4 rounded-lg overflow-hidden">
          <Image
            src={post.image_url}
            alt="Post image"
            width={800}
            height={600}
            className="w-full h-auto object-contain max-h-96"
          />
        </div>
      )}

      {post.video_url && (
        <div className="mb-4 rounded-lg overflow-hidden bg-black">
          <video
            src={post.video_url}
            controls
            poster={post.video_thumbnail_url || undefined}
            className="w-full max-h-96"
          >
            Your browser does not support the video tag.
          </video>
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
        <CommentsSection postId={post.id} onCommentAdded={handleCommentAdded} />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-black mb-4">Delete Post</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this post? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
