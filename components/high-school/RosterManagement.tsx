'use client'

import { useState, useEffect } from 'react'
import { PLAYER_POSITIONS, MAX_POSITIONS, validatePositions } from '@/lib/high-school/positions'
import Image from 'next/image'
import Link from 'next/link'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getProfilePath } from '@/lib/profile-url'

const GRADUATION_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const CURRENT_YEAR = new Date().getFullYear()
const GRADUATION_YEARS = Array.from({ length: 8 }, (_, idx) => CURRENT_YEAR + idx - 1)

interface RosterManagementProps {
  schoolId: string
  schoolUsername: string
  players: any[]
}

export default function RosterManagement({
  schoolId,
  schoolUsername,
  players: initialPlayers,
}: RosterManagementProps) {
  const [players, setPlayers] = useState(initialPlayers)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    positions: [] as string[],
    email: '',
    graduation_month: '',
    graduation_year: '',
    jersey_number: '',
  })
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'released' | 'pending' | 'requests'>('active')
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    { user_id: string; full_name: string | null; username: string | null }[]
  >([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ user_id: string; full_name: string | null; username: string | null } | null>(null)
  const [invitePositions, setInvitePositions] = useState<string[]>([])
  const [inviteDetails, setInviteDetails] = useState({
    jersey_number: '',
    graduation_month: '',
    graduation_year: '',
  })
  const [inviteSubmitting, setInviteSubmitting] = useState(false)

  const handleSearch = async (query: string) => {
    setSearchQuery(query)

    if (!query || query.trim().length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setSearchLoading(true)
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search users')
      }

      setSearchResults(data.users || [])
      setShowSearchResults(true)
    } catch (err) {
      console.error('Failed to search users', err)
      setSearchResults([])
      setShowSearchResults(false)
    } finally {
      setSearchLoading(false)
    }
  }

  const openInviteModal = (user: { user_id: string; full_name: string | null; username: string | null }) => {
    setSelectedUser(user)
    setSearchQuery('')
    setSearchResults([])
    setInvitePositions([])
    setInviteDetails({
      jersey_number: '',
      graduation_month: '',
      graduation_year: '',
    })
    setShowSearchResults(false)
  }

  const closeInviteModal = () => {
    setSelectedUser(null)
    setShowSearchResults(false)
    setInvitePositions([])
    setInviteDetails({
      jersey_number: '',
      graduation_month: '',
      graduation_year: '',
    })
    setInviteSubmitting(false)
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    if (invitePositions.length === 0) {
      setError('Select at least one position for this player')
      return
    }

    setInviteSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/high-school/${schoolId}/players/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: selectedUser.full_name || selectedUser.username || 'Player',
          positions: invitePositions,
          user_id: selectedUser.user_id,
          username: selectedUser.username || undefined,
          email: null,
          graduation_month: inviteDetails.graduation_month || null,
          graduation_year: inviteDetails.graduation_year ? Number(inviteDetails.graduation_year) : null,
          jersey_number: inviteDetails.jersey_number || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite player')
      }

      await loadPlayers()
      closeInviteModal()
    } catch (err: any) {
      setError(err.message || 'Failed to invite player')
      setInviteSubmitting(false)
    }
  }

  const loadPlayers = async (silent = false) => {
    try {
      const response = await fetch(`/api/high-school/${schoolId}/players/list`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load players')
      }
      setPlayers(data.players || [])
      if (!silent) {
        setError(null)
      }
    } catch (err: any) {
      console.error('Error loading players:', err)
      if (!silent) {
        setError(err.message || 'Failed to load players')
      }
    }
  }

  useEffect(() => {
    loadPlayers(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId])

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate positions
    const validation = validatePositions(formData.positions)
    if (!validation.valid) {
      setError(validation.error || 'Invalid positions')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/high-school/${schoolId}/players/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          positions: formData.positions,
          email: formData.email.trim().toLowerCase(),
          graduation_month: formData.graduation_month || null,
          graduation_year: formData.graduation_year ? Number(formData.graduation_year) : null,
          jersey_number: formData.jersey_number || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add player')
      }

      if (data.success) {
        // Reset form
        setFormData({
          name: '',
          positions: [],
          email: '',
          graduation_month: '',
          graduation_year: '',
          jersey_number: '',
        })
        setShowAddForm(false)
        // Reload players
        await loadPlayers()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add player')
    } finally {
      setLoading(false)
    }
  }

  const handleRelease = async (playerId: string, isPendingInvite: boolean) => {
    const confirmMessage = isPendingInvite
      ? 'Cancel this invite? The pending player will be removed from the roster.'
      : 'Are you sure you want to release this player?'

    if (!confirm(confirmMessage)) return

    try {
      const response = await fetch(
        `/api/high-school/${schoolId}/players/${playerId}/release`,
        {
          method: 'POST',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to release player')
      }

      await loadPlayers()
    } catch (err: any) {
      alert(err.message || 'Failed to release player')
    }
  }

  const handleResendInvite = async (playerId: string) => {
    setError(null)
    setResendingInviteId(playerId)
    try {
      const response = await fetch(
        `/api/high-school/${schoolId}/players/${playerId}/resend-invite`,
        {
          method: 'POST',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend invite')
      }

      alert('Invite sent again!')
    } catch (err: any) {
      setError(err.message || 'Failed to resend invite')
    } finally {
      setResendingInviteId(null)
    }
  }

  const handleCancelInvite = async (playerId: string) => {
    if (!confirm('Are you sure you want to cancel this invite? The player will no longer receive the request.')) return
    
    try {
      setError(null)
      const response = await fetch(`/api/high-school/${schoolId}/players/${playerId}/cancel-invite`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel invite')
      }

      await loadPlayers()
    } catch (err: any) {
      setError(err.message || 'Failed to cancel invite')
    }
  }

  const handleAcceptRequest = async (playerId: string, userId: string) => {
    if (!confirm('Accept this player\'s request to join the roster?')) return
    
    try {
      setError(null)
      const response = await fetch('/api/high-school/players/respond-to-school-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: userId,
          schoolId: schoolId,
          action: 'accept',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept request')
      }

      await loadPlayers()
      alert('Player request accepted!')
    } catch (err: any) {
      setError(err.message || 'Failed to accept request')
    }
  }

  const handleDenyRequest = async (playerId: string, userId: string) => {
    if (!confirm('Deny this player\'s request to join the roster?')) return
    
    try {
      setError(null)
      const response = await fetch('/api/high-school/players/respond-to-school-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: userId,
          schoolId: schoolId,
          action: 'deny',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deny request')
      }

      // Remove the pending request record after denial
      await fetch(`/api/high-school/${schoolId}/players/${playerId}/cancel-invite`, {
        method: 'DELETE',
      })

      await loadPlayers()
      alert('Player request denied.')
    } catch (err: any) {
      setError(err.message || 'Failed to deny request')
    }
  }

  const filteredPlayers = players.filter((player) => {
    if (activeFilter === 'active') return !player.released_at && player.user_id && player.request_status !== 'pending'
    if (activeFilter === 'released') return player.released_at
    if (activeFilter === 'pending') {
      // Email invites (no user_id, no request_status)
      return !player.user_id && !player.released_at && !player.request_status
    }
    if (activeFilter === 'requests') {
      // Player-initiated requests (has user_id, request_status: 'pending')
      return player.request_status === 'pending' && player.user_id && !player.released_at
    }
    return true
  })

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
        <h1 className="text-2xl font-bold text-black">Roster Management</h1>
        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
          <div className="relative md:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 150)}
              placeholder="Search existing players..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
              </div>
            )}
            {showSearchResults && (
              <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">No users found.</p>
                ) : (
                  searchResults.map((user) => (
                    <button
                      key={user.user_id}
                      type="button"
                      onClick={() => openInviteModal(user)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50"
                    >
                      <p className="text-sm font-semibold text-black">
                        {user.full_name || user.username || 'Unnamed user'}
                      </p>
                      {user.username && <p className="text-xs text-gray-500">@{user.username}</p>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="interactive-press inline-flex items-center justify-center h-9 px-4 rounded-full bg-black text-sm font-semibold text-white hover:bg-gray-900 transition-colors"
          >
            {showAddForm ? 'Cancel' : 'Add Manually'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg whitespace-pre-line">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-black">Invite Player</h2>
                <p className="text-sm text-gray-600">
                  {selectedUser.full_name || selectedUser.username} will be added immediately once you
                  set their positions.
                </p>
              </div>
              <button
                type="button"
                onClick={closeInviteModal}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Positions <span className="text-red-500">*</span> (Select up to {MAX_POSITIONS})
                </label>
                <select
                  multiple
                  value={invitePositions}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (option) => option.value)
                    setInvitePositions(selected.slice(0, MAX_POSITIONS))
                  }}
                  size={Math.min(PLAYER_POSITIONS.length, 8)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black bg-white"
                >
                  {PLAYER_POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Selected: {invitePositions.join(', ') || 'None yet'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Jersey Number</label>
                  <input
                    type="text"
                    value={inviteDetails.jersey_number}
                    onChange={(e) =>
                      setInviteDetails((prev) => ({ ...prev, jersey_number: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                    placeholder="12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Graduation Month</label>
                  <select
                    value={inviteDetails.graduation_month}
                    onChange={(e) =>
                      setInviteDetails((prev) => ({ ...prev, graduation_month: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-black"
                  >
                    <option value="">Select</option>
                    {GRADUATION_MONTHS.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Graduation Year</label>
                  <select
                    value={inviteDetails.graduation_year}
                    onChange={(e) =>
                      setInviteDetails((prev) => ({ ...prev, graduation_year: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-black"
                  >
                    <option value="">Select</option>
                    {GRADUATION_YEARS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeInviteModal}
                  className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting || invitePositions.length === 0}
                  className="px-5 py-2 text-sm font-semibold rounded-full text-white bg-black hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviteSubmitting ? 'Adding...' : 'Add to Roster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Player Form */}
      {showAddForm && (
        <form onSubmit={handleAddPlayer} className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-black mb-3">Add Player to Roster</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Positions <span className="text-red-500">*</span> (Select up to {MAX_POSITIONS})
              </label>
              <select
                multiple
                value={formData.positions}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (option) => option.value)
                  setFormData((prev) => ({
                    ...prev,
                    positions: selected.slice(0, MAX_POSITIONS),
                  }))
                }}
                size={Math.min(PLAYER_POSITIONS.length, 8)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black bg-white"
              >
                {PLAYER_POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Hold Cmd/Ctrl to select multiple. Selected: {formData.positions.join(', ') || 'None'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Jersey Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.jersey_number}
                  onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                  placeholder="12"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Graduation Month (Optional)
                </label>
                <select
                  value={formData.graduation_month}
                  onChange={(e) => setFormData({ ...formData, graduation_month: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-black"
                >
                  <option value="">Select month</option>
                  {GRADUATION_MONTHS.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Graduation Year (Optional)
                </label>
                <select
                  value={formData.graduation_year}
                  onChange={(e) => setFormData({ ...formData, graduation_year: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-black"
                >
                  <option value="">Select year</option>
                  {GRADUATION_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !formData.name || !formData.email || formData.positions.length === 0}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Adding...' : 'Add Player'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(['active', 'pending', 'requests', 'released', 'all'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeFilter === filter
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter === 'requests' ? 'Requests' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Players List */}
      <div className="space-y-3">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No players found.
          </div>
        ) : (
          filteredPlayers.map((player) => {
            const profilePath = player.profiles?.id 
              ? getProfilePath(player.profiles.id, player.profiles.username)
              : null
            const isClickable = !!profilePath && !!player.user_id

            return (
              <div
                key={player.id}
                className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between shadow-sm"
              >
                {isClickable ? (
                  <Link
                    href={profilePath}
                    className="flex items-center gap-4 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                  >
                    {player.profiles?.avatar_url && isMeaningfulAvatar(player.profiles.avatar_url) ? (
                      <Image
                        src={player.profiles.avatar_url}
                        alt={player.profiles.full_name || player.name}
                        width={48}
                        height={48}
                        className="rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${getGradientForId(
                          player.user_id || player.id
                        )}`}
                      >
                        {(player.profiles?.full_name || player.name).charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-black truncate">
                        {player.profiles?.full_name || player.name}
                      </p>
                      {player.positions && Array.isArray(player.positions) && player.positions.length > 0 && (
                        <p className="text-sm text-gray-600 truncate">
                          {player.positions.join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 truncate">{player.email}</p>
                      {player.request_status === 'pending' && (
                        <p className="text-xs text-orange-600 mt-1">Request pending</p>
                      )}
                      {!player.user_id && !player.request_status && (
                        <p className="text-xs text-yellow-600 mt-1">Invite pending</p>
                      )}
                      {player.release_requested_at && (
                        <p className="text-xs text-orange-600 mt-1">Release requested</p>
                      )}
                      {player.released_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Released {new Date(player.released_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {player.profiles?.avatar_url && isMeaningfulAvatar(player.profiles.avatar_url) ? (
                      <Image
                        src={player.profiles.avatar_url}
                        alt={player.profiles.full_name || player.name}
                        width={48}
                        height={48}
                        className="rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${getGradientForId(
                          player.user_id || player.id
                        )}`}
                      >
                        {(player.profiles?.full_name || player.name).charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-black truncate">
                        {player.profiles?.full_name || player.name}
                      </p>
                      {player.positions && Array.isArray(player.positions) && player.positions.length > 0 && (
                        <p className="text-sm text-gray-600 truncate">
                          {player.positions.join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 truncate">{player.email}</p>
                      {player.request_status === 'pending' && (
                        <p className="text-xs text-orange-600 mt-1">Request pending</p>
                      )}
                      {!player.user_id && !player.request_status && (
                        <p className="text-xs text-yellow-600 mt-1">Invite pending</p>
                      )}
                      {player.release_requested_at && (
                        <p className="text-xs text-orange-600 mt-1">Release requested</p>
                      )}
                      {player.released_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Released {new Date(player.released_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              {!player.released_at && (
                player.user_id ? (
                  // User exists - show buttons based on request status and filter
                  player.request_status === 'pending' ? (
                    // Player-initiated request (added_by is null) - show Accept/Deny
                    // Admin-initiated request (added_by is set) - show Cancel Request
                    player.added_by === null ? (
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleAcceptRequest(player.id, player.user_id)}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors text-green-700 bg-green-50 border border-green-200 hover:bg-green-100"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDenyRequest(player.id, player.user_id)}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors text-red-600 border border-red-200 hover:bg-red-50"
                        >
                          Deny
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCancelInvite(player.id)}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ml-4 text-red-600 border border-red-200 hover:bg-red-50"
                      >
                        Cancel Request
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handleRelease(player.id, false)}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ml-4 text-red-600 border border-red-200 hover:bg-red-50"
                    >
                      Release
                    </button>
                  )
                ) : (
                  // No user_id - email invite
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleResendInvite(player.id)}
                      disabled={resendingInviteId === player.id}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendingInviteId === player.id ? 'Sending...' : 'Resend Invite'}
                    </button>
                    <button
                      onClick={() => handleRelease(player.id, true)}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-100"
                    >
                      Cancel Invite
                    </button>
                  </div>
                )
              )}
            </div>
            )
          })
        )}
      </div>
    </div>
  )
}

