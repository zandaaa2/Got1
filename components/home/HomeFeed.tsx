'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import CreatePost from './CreatePost'
import FeedItem from './FeedItem'

type FeedMode = 'trending' | 'following'

interface FeedItemData {
  type: 'post' | 'evaluation' | 'blog'
  id: string
  created_at: string
  data: any
}

export default function HomeFeed() {
  const [mode, setMode] = useState<FeedMode>('trending')
  const [items, setItems] = useState<FeedItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPostModal, setShowPostModal] = useState(false)
  const supabase = createClient()

  const loadFeed = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in to view the feed')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/posts/feed?mode=${mode}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load feed')
      }

      setItems(result.items || [])
    } catch (err: any) {
      console.error('Error loading feed:', err)
      setError(err.message || 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const handlePostCreated = () => {
    loadFeed() // Reload feed after new post
  }

  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* Header with tabs */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setMode('trending')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'trending'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Trending
          </button>
          <button
            onClick={() => setMode('following')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'following'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Following
          </button>
        </div>
      </div>

      {/* Create Post - Desktop only */}
      <div className="mb-6 hidden md:block">
        <CreatePost onPostCreated={handlePostCreated} />
      </div>

      {/* Mobile Post Modal - Full Screen */}
      {showPostModal && (
        <>
          <div className="fixed inset-0 bg-white z-50 md:hidden flex flex-col">
            {/* Header - Fixed at top */}
            <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-white">
              <button
                onClick={() => setShowPostModal(false)}
                className="p-2 text-gray-600 hover:text-black transition-colors"
                aria-label="Close"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-black">Create Post</h2>
              <div className="w-10"></div> {/* Spacer for centering */}
            </div>
            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto pb-20">
              <div className="p-4">
                <CreatePost 
                  onPostCreated={() => {
                    handlePostCreated()
                    setShowPostModal(false)
                  }} 
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mobile Post Button - Fixed above bottom nav */}
      <button
        onClick={() => setShowPostModal(true)}
        className="fixed bottom-28 left-1/2 transform -translate-x-1/2 z-30 md:hidden px-4 py-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors font-medium text-xs flex items-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create Post
      </button>

      {/* Feed Items */}
      {loading ? (
        <div className="space-y-6">
          {/* Skeleton loaders for better perceived performance */}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
              <div className="h-64 bg-gray-200 rounded-lg mb-4"></div>
              <div className="flex items-center gap-4">
                <div className="h-5 bg-gray-200 rounded w-16"></div>
                <div className="h-5 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadFeed}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {mode === 'following'
              ? "You're not following anyone yet. Follow users to see their posts and evaluations here!"
              : 'No posts or evaluations yet. Be the first to post!'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((item) => (
            <FeedItem key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
