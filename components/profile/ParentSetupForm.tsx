'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ParentSetupFormProps {
  profile: any
}

export default function ParentSetupForm({ profile }: ParentSetupFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    email: profile?.email || '',
    phone: profile?.phone || '',
  })

  const [playerSearchQuery, setPlayerSearchQuery] = useState('')
  const [playerSearchResults, setPlayerSearchResults] = useState<any[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [searchingPlayer, setSearchingPlayer] = useState(false)

  // Search for players when query changes
  useEffect(() => {
    const searchPlayers = async () => {
      if (playerSearchQuery.length >= 2) {
        setSearchingPlayer(true)
        const { data } = await supabase
          .from('profiles')
          .select('id, user_id, username, full_name, avatar_url')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Update profile to parent role with email and phone
      const updateData: any = {
        role: 'parent',
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', session.user.id)

      if (updateError) throw updateError

      // If a player was selected, create parent_children relationship
      if (selectedPlayerId) {
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
      }

      // Redirect to profile page
      router.push('/profile')
      router.refresh()
    } catch (error: any) {
      console.error('Error updating parent profile:', error)
      setError(error.message || 'Failed to update profile. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">Complete Your Parent Profile</h1>
      <p className="text-gray-600 mb-8">
        Set up your parent account to manage your child's player page and purchase evaluations on their behalf.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="your.email@example.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your contact email address.
          </p>
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-black mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="(555) 123-4567"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your contact phone number.
          </p>
        </div>

        {/* Attach Player Section */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-black mb-4">Attach Player</h2>
          <p className="text-sm text-gray-600 mb-4">
            You can link to an existing player page or create a new one. You can also do this later from your profile.
          </p>

          {/* Tag Existing Player */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-black mb-2">
              Tag Existing Player Page
            </label>
            <div className="relative">
              <input
                type="text"
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                placeholder="Search for player username or name..."
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

          {/* Create Player Page */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Create New Player Page
            </label>
            <Link
              href="/profile/parent/create-player"
              className="inline-flex items-center justify-center px-4 py-2 border-2 border-black rounded-lg bg-white text-black font-medium hover:bg-gray-50 transition-colors"
            >
              Create Player Page
            </Link>
            <p className="text-xs text-gray-500 mt-2">
              Create a new player page for your child. You'll be able to fill in all player information.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : 'Save and Continue'}
          </button>
          <Link
            href="/profile"
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Skip for Now
          </Link>
        </div>
      </form>
    </div>
  )
}





