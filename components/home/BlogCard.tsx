'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getGradientForId } from '@/lib/gradients'
import BlogCommentsSection from './BlogCommentsSection'

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

interface BlogCardProps {
  blog: {
    id: string
    slug: string
    title: string
    excerpt: string
    image: string
    author: string
    author_email: string
    published_at: string
    created_at: string
    scout_id: string
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
}

export default function BlogCard({ blog }: BlogCardProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isOwnBlog, setIsOwnBlog] = useState(false)
  const [isTogglingPin, setIsTogglingPin] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [likes, setLikes] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [comments, setComments] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  
  const profile = blog.profiles
  const authorName = profile?.full_name || blog.author
  const authorUsername = profile?.username
  const avatarUrl = profile?.avatar_url && isMeaningfulAvatar(profile.avatar_url) ? profile.avatar_url : null
  const gradientClass = getGradientForId(profile?.user_id || blog.scout_id || blog.id)
  const initial = authorName?.charAt(0).toUpperCase() || 'A'

  // Check if current user owns this blog
  useEffect(() => {
    const checkOwnership = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && (session.user.id === blog.scout_id || session.user.email === blog.author_email)) {
        setIsOwnBlog(true)
      }
    }
    checkOwnership()
  }, [blog.scout_id, blog.author_email, supabase])

  // Check pinned status
  useEffect(() => {
    const checkPinned = async () => {
      try {
        const { data } = await supabase
          .from('blog_posts')
          .select('pinned')
          .eq('id', blog.id)
          .single()
        if (data) {
          setPinned(data.pinned || false)
        }
      } catch (error) {
        console.error('Error checking pinned status:', error)
      }
    }
    checkPinned()
  }, [blog.id, supabase])

  // Fetch like count and comment count on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch like count and status using unified API
        const likeResponse = await fetch(`/api/likes?likeableType=blog_post&likeableId=${blog.id}`)
        if (likeResponse.ok) {
          const likeData = await likeResponse.json()
          setLikes(likeData.likeCount || 0)
          setIsLiked(likeData.isLiked || false)
        }

        // Fetch comment count
        const { count } = await supabase
          .from('blog_comments')
          .select('*', { count: 'exact', head: true })
          .eq('blog_post_id', blog.id)
        
        setComments(count || 0)
      } catch (error) {
        console.error('Error fetching blog data:', error)
      }
    }
    fetchData()
  }, [blog.id, supabase])

  const handleTogglePin = async () => {
    try {
      setIsTogglingPin(true)
      const response = await fetch(`/api/blog/${blog.slug}/pin`, {
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
    } catch (error: any) {
      console.error('Error toggling pin:', error)
      alert(error.message || 'Failed to toggle pin')
    } finally {
      setIsTogglingPin(false)
    }
  }

  const handleEdit = () => {
    router.push(`/blog/${blog.slug}/edit`)
    setShowMoreMenu(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this blog post?')) {
      setShowMoreMenu(false)
      return
    }

    try {
      const response = await fetch(`/api/blog/${blog.slug}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete blog post' }))
        throw new Error(error.error || 'Failed to delete blog post')
      }

      // Reload the page to refresh the feed
      window.location.reload()
    } catch (error: any) {
      console.error('Error deleting blog:', error)
      alert(error.message || 'Failed to delete blog post')
      setShowMoreMenu(false)
    }
  }

  const handleLike = async () => {
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          likeableType: 'blog_post',
          likeableId: blog.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setLikes(data.likeCount || 0)
        setIsLiked(data.liked || false)
      } else {
        // If unauthorized, redirect to sign in
        if (response.status === 401) {
          router.push('/auth/signin')
        } else {
          console.error('Error liking blog:', await response.json())
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
      const { count } = await supabase
        .from('blog_comments')
        .select('*', { count: 'exact', head: true })
        .eq('blog_post_id', blog.id)
      
      setComments(count || 0)
    } catch (error) {
      console.error('Error fetching comment count:', error)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/blog/${blog.slug}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: blog.title,
          text: blog.excerpt,
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

  return (
    <article className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Header Image */}
      {blog.image && (
        <Link href={`/blog/${blog.slug}`}>
          <div className="relative w-full h-48 overflow-hidden">
            <Image
              src={blog.image}
              alt={blog.title}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
              unoptimized
            />
          </div>
        </Link>
      )}

      <div className="p-6">
        {/* Author Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {authorUsername ? (
              <Link 
                href={`/${authorUsername}`}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={authorName}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${gradientClass}`}>
                    {initial}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-black">{authorName}</p>
                  {profile?.organization && (
                    <p className="text-xs text-gray-500">{profile.organization}</p>
                  )}
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={authorName}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${gradientClass}`}>
                    {initial}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-black">{authorName}</p>
                  {profile?.organization && (
                    <p className="text-xs text-gray-500">{profile.organization}</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{formatTimeAgo(blog.published_at || blog.created_at)}</span>
            {/* More Options Button */}
            <div className="relative">
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
                    {isOwnBlog ? (
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
                          Edit blog post
                        </button>
                        <button
                          onClick={handleDelete}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Delete blog post
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
                        Report blog post
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Blog Content */}
        <Link href={`/blog/${blog.slug}`} className="block group">
          <h2 className="text-xl font-semibold text-black mb-2 group-hover:text-blue-600 transition-colors">
            {blog.title}
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
            {blog.excerpt}
          </p>
        </Link>

        {/* Read More Link */}
        <div className="mt-4">
          <Link
            href={`/blog/${blog.slug}`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Read more →
          </Link>
        </div>

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
        <BlogCommentsSection blogId={blog.id} onCommentAdded={handleCommentAdded} />
      )}
    </div>
    </article>
  )
}

