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

      {/* Mobile Post Modal */}
      {showPostModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowPostModal(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">Create Post</h2>
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
            </div>
            <div className="p-4">
              <CreatePost 
                onPostCreated={() => {
                  handlePostCreated()
                  setShowPostModal(false)
                }} 
              />
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
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="relative w-12 h-12 mx-auto">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-sm font-medium text-gray-600">Loading feed...</p>
          </div>
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
