'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

interface FollowButtonProps {
  userId: string
  className?: string
}

export default function FollowButton({ userId, className = '' }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoading(false)
          setCurrentUserId(null)
          return
        }

        setCurrentUserId(session.user.id)

        if (session.user.id === userId) {
          setLoading(false)
          return
        }

        const response = await fetch(`/api/follows/check?userId=${userId}`)
        const result = await response.json()

        if (response.ok) {
          setIsFollowing(result.isFollowing)
        }
      } catch (err) {
        console.error('Error checking follow status:', err)
      } finally {
        setLoading(false)
      }
    }

    checkFollowStatus()
  }, [userId])

  const handleFollow = async () => {
    if (!currentUserId || currentUserId === userId) return

    setUpdating(true)
    try {
      const response = await fetch('/api/follows/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        setIsFollowing(true)
        // Trigger a custom event to notify other components that follow status changed
        window.dispatchEvent(new CustomEvent('follow-status-changed', { 
          detail: { userId, isFollowing: true } 
        }))
      }
    } catch (err) {
      console.error('Error following user:', err)
    } finally {
      setUpdating(false)
    }
  }

  const handleUnfollow = async () => {
    if (!currentUserId) return

    setUpdating(true)
    try {
      const response = await fetch('/api/follows/unfollow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        setIsFollowing(false)
        // Trigger a custom event to notify other components that follow status changed
        window.dispatchEvent(new CustomEvent('follow-status-changed', { 
          detail: { userId, isFollowing: false } 
        }))
      }
    } catch (err) {
      console.error('Error unfollowing user:', err)
    } finally {
      setUpdating(false)
    }
  }

  // Don't show button if checking own profile or still loading
  if (loading) {
    return (
      <div className={`px-4 py-2 bg-gray-100 rounded-lg ${className}`}>
        <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!currentUserId || currentUserId === userId) {
    return null
  }

  return (
    <button
      onClick={isFollowing ? handleUnfollow : handleFollow}
      disabled={updating}
      className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isFollowing
          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          : 'bg-black text-white hover:bg-gray-800'
      } ${className}`}
    >
      {updating ? '...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
