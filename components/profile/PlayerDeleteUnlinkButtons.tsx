'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PlayerDeleteUnlinkButtonsProps {
  playerId: string
  playerUserId: string
  isCreatedByParent: boolean
}

export default function PlayerDeleteUnlinkButtons({
  playerId,
  playerUserId,
  isCreatedByParent,
}: PlayerDeleteUnlinkButtonsProps) {
  const [deleting, setDeleting] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const router = useRouter()

  const handleDeletePlayer = async () => {
    if (!confirm('Are you sure you want to delete this player? This will permanently delete the player profile and cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      
      console.log('🔍 Attempting to delete player via API:', { player_id: playerUserId })

      const response = await fetch('/api/parent/delete-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ player_id: playerUserId }),
      })

      console.log('🔍 API Response status:', response.status, response.statusText)

      const data = await response.json()
      console.log('🔍 API Response data:', data)

      if (!response.ok) {
        console.error('❌ API Error:', data)
        throw new Error(data.error || 'Failed to delete player')
      }

      console.log('✅ Successfully deleted player')
      
      // Redirect to parent profile
      router.push('/profile')
      router.refresh()
    } catch (error: any) {
      console.error('❌ Error deleting player:', error)
      alert(error.message || 'Failed to delete player. Please check the browser console for details.')
      setDeleting(false)
    }
  }

  const handleUnlinkPlayer = async () => {
    if (!confirm('Are you sure you want to unlink this player? You will no longer be able to manage their profile or purchase evaluations on their behalf.')) {
      return
    }

    try {
      setUnlinking(true)
      
      console.log('🔍 Attempting to unlink player via API:', { player_id: playerUserId })

      const response = await fetch('/api/parent/unlink-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ player_id: playerUserId }),
      })

      console.log('🔍 API Response status:', response.status, response.statusText)

      const data = await response.json()
      console.log('🔍 API Response data:', data)

      if (!response.ok) {
        console.error('❌ API Error:', data)
        throw new Error(data.error || 'Failed to unlink player')
      }

      console.log('✅ Successfully unlinked player')
      
      // Redirect to parent profile
      router.push('/profile')
      router.refresh()
    } catch (error: any) {
      console.error('❌ Error unlinking player:', error)
      alert(error.message || 'Failed to unlink player. Please check the browser console for details.')
      setUnlinking(false)
    }
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex flex-col sm:flex-row gap-3">
        {isCreatedByParent ? (
          <button
            onClick={handleDeletePlayer}
            disabled={deleting}
            className="inline-flex items-center justify-center h-10 px-4 rounded-full border border-red-200 bg-white text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? (
              <>
                <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin mr-2"></div>
                Deleting...
              </>
            ) : (
              'Delete Player'
            )}
          </button>
        ) : (
          <button
            onClick={handleUnlinkPlayer}
            disabled={unlinking}
            className="inline-flex items-center justify-center h-10 px-4 rounded-full border border-red-200 bg-white text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {unlinking ? (
              <>
                <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin mr-2"></div>
                Unlinking...
              </>
            ) : (
              'Unlink Player'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
