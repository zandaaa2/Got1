'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

interface InlineFollowButtonProps {
  userId: string
  className?: string
}

export default function InlineFollowButton({ userId, className = '' }: InlineFollowButtonProps) {
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

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
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
      }
    } catch (err) {
      console.error('Error following user:', err)
    } finally {
      setUpdating(false)
    }
  }

  // Don't show button if checking own profile, not logged in, or still loading
  if (loading || !currentUserId || currentUserId === userId || isFollowing) {
    return null
  }

  return (
    <button
      onClick={handleFollow}
      disabled={updating}
      className={`text-xs px-2 py-0.5 rounded text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium ${className}`}
    >
      {updating ? '...' : 'Follow'}
    </button>
  )
}
