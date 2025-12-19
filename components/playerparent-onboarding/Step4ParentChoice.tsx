'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

interface Step4ParentChoiceProps {
  profile: any
  onTagExisting: (playerProfile: any) => void
  onCreateNew: (playerProfile: any) => void
  onBack: () => void
}

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback: Generate UUID v4 format
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export default function Step4ParentChoice({ profile, onTagExisting, onCreateNew, onBack }: Step4ParentChoiceProps) {
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')
  const [playerSearchResults, setPlayerSearchResults] = useState<any[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [searchingPlayer, setSearchingPlayer] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Search for players when query changes
  useEffect(() => {
    const searchPlayers = async () => {
      if (playerSearchQuery.length >= 2) {
        setSearchingPlayer(true)
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'player')
          .or(`username.ilike.%${playerSearchQuery}%,full_name.ilike.%${playerSearchQuery}%`)
          .limit(10)
        setPlayerSearchResults(data || [])
        setSearchingPlayer(false)
      } else {
        setPlayerSearchResults([])
      }
    }

    const timeoutId = setTimeout(searchPlayers, 300) // Debounce
    return () => clearTimeout(timeoutId)
  }, [playerSearchQuery, supabase])

  const handleTagExisting = async () => {
    if (!selectedPlayerId) {
      setError('Please select a player')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Fetch the full player profile
      const { data: playerProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', selectedPlayerId)
        .single()

      if (fetchError) throw fetchError

      // Create parent_children relationship
      const { error: linkError } = await supabase
        .from('parent_children')
        .insert({
          parent_id: session.user.id,
          player_id: selectedPlayerId,
        })

      if (linkError) {
        if (linkError.code === '23505') { // Unique constraint violation
          setError('This player is already linked to another parent account')
        } else {
          throw linkError
        }
        setLoading(false)
        return
      }

      onTagExisting(playerProfile)
    } catch (err: any) {
      setError(err.message || 'Failed to tag player')
      setLoading(false)
    }
  }

  const handleCreateNew = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Use API route to create player profile (bypasses RLS and creates auth user)
      const response = await fetch('/api/parent/create-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // No body needed - API creates auth user internally
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ API error response:', data)
        throw new Error(data.error || 'Failed to create player profile')
      }

      console.log('📦 API response:', data)

      // The API returns { playerProfile, message } directly via successResponse
      // Check both possible response structures for compatibility
      const playerProfile = data.playerProfile || data.data?.playerProfile

      if (!playerProfile) {
        console.error('❌ No player profile in response. Full response:', JSON.stringify(data, null, 2))
        throw new Error('No player profile returned from API')
      }

      console.log('✅ Player profile created successfully:', {
        id: playerProfile.id,
        user_id: playerProfile.user_id,
        role: playerProfile.role,
        username: playerProfile.username
      })
      
      // Verify the parent_children link was created
      const { data: { session: verifySession } } = await supabase.auth.getSession()
      if (verifySession) {
        const { data: parentLink } = await supabase
          .from('parent_children')
          .select('*')
          .eq('parent_id', verifySession.user.id)
          .eq('player_id', playerProfile.user_id)
          .maybeSingle()
        
        console.log('🔗 Parent-Child link verification:', {
          parentId: verifySession.user.id,
          playerId: playerProfile.user_id,
          linkExists: !!parentLink,
          linkData: parentLink
        })
        
        if (!parentLink) {
          console.error('⚠️ WARNING: Parent-Child link not found after player creation!')
        }
      }
      
      setLoading(false)
      onCreateNew(playerProfile)
    } catch (err: any) {
      setError(err.message || 'Failed to create player profile')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h3 className="text-lg font-bold text-black mb-2">Link Player Account</h3>
        <p className="text-gray-600 text-sm mb-4">
          Tag an existing player account or create a new player page for your child.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tag Existing Player */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-black mb-4">Tag Existing Player Page</h4>
        <div className="mb-4">
          <label className="block text-sm font-medium text-black mb-2">
            Search for Player
          </label>
          <div className="relative">
            <input
              type="text"
              value={playerSearchQuery}
              onChange={(e) => setPlayerSearchQuery(e.target.value)}
              placeholder="Search by username or name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
            {searchingPlayer && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
              </div>
            )}
            {playerSearchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {playerSearchResults.map((player: any) => (
                  <button
                    key={player.user_id}
                    type="button"
                    onClick={() => {
                      setSelectedPlayerId(player.user_id)
                      setPlayerSearchQuery(player.username || player.full_name || '')
                      setPlayerSearchResults([])
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
                  >
                    {player.avatar_url ? (
                      <img
                        src={player.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs text-gray-500">
                          {player.full_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-black">
                        {player.full_name || 'Unknown'}
                      </div>
                      {player.username && (
                        <div className="text-sm text-gray-500">@{player.username}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedPlayerId && (
            <div className="flex items-center gap-2 text-sm text-green-700 mt-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Player selected
            </div>
          )}
        </div>
        <button
          onClick={handleTagExisting}
          disabled={!selectedPlayerId || loading}
          className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Linking...' : 'Tag Existing Player'}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200"></div>
        <span className="text-sm text-gray-500">OR</span>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>

      {/* Create New Player */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-black mb-2">Create New Player Page</h4>
        <p className="text-sm text-gray-600 mb-4">
          Create a new player page for your child. You'll fill in all player information in the next steps.
        </p>
        <button
          onClick={handleCreateNew}
          disabled={loading}
          className="w-full py-3 border-2 border-black text-black rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create New Player Page'}
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-gray-300 text-black rounded-lg font-medium hover:bg-gray-50"
        >
          Back
        </button>
      </div>
    </div>
  )
}













