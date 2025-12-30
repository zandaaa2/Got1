'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'

interface DiscoverMoreProps {
  currentPostId: string
  userId: string | null
}

interface FeedItem {
  type: 'post' | 'evaluation' | 'blog'
  id: string
  created_at: string
  data: any
}

export default function DiscoverMore({ currentPostId, userId }: DiscoverMoreProps) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        // Feed API requires authentication
        if (!userId) {
          console.log('DiscoverMore: No userId, skipping fetch')
          setLoading(false)
          return
        }

        console.log('DiscoverMore: Fetching feed for userId:', userId)
        const response = await fetch('/api/posts/feed?mode=trending&limit=15')
        
        if (!response.ok) {
          console.error('DiscoverMore: Feed API error:', response.status, response.statusText)
          const errorText = await response.text()
          console.error('DiscoverMore: Error response:', errorText)
          setLoading(false)
          return
        }

        const data = await response.json()
        console.log('DiscoverMore: Feed API response:', data)
        console.log('DiscoverMore: Items count:', data.items?.length || 0)
        
        // Filter out the current post and limit to 10 items
        const filteredItems = data.items
          ?.filter((item: FeedItem) => item.id !== currentPostId)
          .slice(0, 10) || []
        
        console.log('DiscoverMore: Filtered items count:', filteredItems.length)
        setItems(filteredItems)
      } catch (error) {
        console.error('DiscoverMore: Error fetching discover more:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFeed()
  }, [currentPostId, userId])

  if (loading) {
    return (
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-black mb-4">Discover more</h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64 h-48 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    // Don't show section if no items
    return null
  }

  const renderPostCard = (item: FeedItem) => {
    const post = item.data
    const profile = post.profiles
    const profilePath = profile?.username 
      ? `/${profile.username}` 
      : `/profile/${profile?.id || ''}`

    return (
      <Link
        key={item.id}
        href={`/posts/${item.id}`}
        className="flex-shrink-0 w-64 bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
      >
        {/* Author */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            {profile?.avatar_url && isMeaningfulAvatar(profile.avatar_url) ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name || 'User'}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${getGradientForId(post.user_id)}`}>
                <span className="text-white text-xs font-semibold">
                  {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-black truncate">
              {profile?.full_name || 'Anonymous'}
            </p>
          </div>
        </div>

        {/* Content preview */}
        {post.content && (
          <p className="text-sm text-gray-900 line-clamp-3 mb-3">
            {post.content}
          </p>
        )}

        {/* Media preview */}
        {post.image_url && (
          <div className="w-full h-32 rounded overflow-hidden mb-2">
            <Image
              src={post.image_url}
              alt="Post"
              width={256}
              height={128}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        )}

        {post.video_thumbnail_url && (
          <div className="w-full h-32 rounded overflow-hidden mb-2 bg-black relative">
            <Image
              src={post.video_thumbnail_url}
              alt="Video"
              width={256}
              height={128}
              className="w-full h-full object-cover opacity-75"
              unoptimized
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </Link>
    )
  }

  const renderEvaluationCard = (item: FeedItem) => {
    const evaluation = item.data
    const scout = evaluation.scout
    const player = evaluation.player

    return (
      <Link
        key={item.id}
        href={`/evaluations/${item.id}`}
        className="flex-shrink-0 w-64 bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            {player?.avatar_url && isMeaningfulAvatar(player.avatar_url) ? (
              <Image
                src={player.avatar_url}
                alt={player.full_name || 'Player'}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${getGradientForId(player?.user_id || '')}`}>
                <span className="text-white text-xs font-semibold">
                  {player?.full_name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-black truncate">
              {player?.full_name || 'Player'}'s Evaluation
            </p>
            <p className="text-xs text-gray-600 truncate">
              by {scout?.full_name || 'Scout'}
            </p>
          </div>
        </div>

        {evaluation.notes && (
          <p className="text-sm text-gray-900 line-clamp-3">
            {evaluation.notes}
          </p>
        )}
      </Link>
    )
  }

  const renderBlogCard = (item: FeedItem) => {
    const blog = item.data

    return (
      <Link
        key={item.id}
        href={`/blog/${blog.slug}`}
        className="flex-shrink-0 w-64 bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      >
        {blog.image && (
          <div className="w-full h-32 relative">
            <Image
              src={blog.image}
              alt={blog.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-black mb-2 line-clamp-2">
            {blog.title}
          </h3>
          {blog.excerpt && (
            <p className="text-xs text-gray-600 line-clamp-2">
              {blog.excerpt}
            </p>
          )}
        </div>
      </Link>
    )
  }

  return (
    <div className="mt-12">
      <h2 className="text-xl font-semibold text-black mb-4">Discover more</h2>
      <div className="overflow-x-auto scrollbar-hide pb-4">
        <div className="flex gap-4" style={{ width: 'max-content' }}>
          {items.map((item) => {
            if (item.type === 'post') {
              return renderPostCard(item)
            } else if (item.type === 'evaluation') {
              return renderEvaluationCard(item)
            } else if (item.type === 'blog') {
              return renderBlogCard(item)
            }
            return null
          })}
        </div>
      </div>
    </div>
  )
}

