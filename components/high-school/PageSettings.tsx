'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { createClient } from '@/lib/supabase-client'

interface PageSettingsProps {
  school: any
  admins: any[]
  pendingInvites?: any[]
}

export default function PageSettings({ school, admins, pendingInvites = [] }: PageSettingsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: school.name,
    username: school.username,
    address: school.address || '',
    hudl_url: school.hudl_url || '',
    x_url: school.x_url || '',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    { user_id: string; full_name: string | null; username: string | null; avatar_url: string | null }[]
  >([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ user_id: string; full_name: string | null; username: string | null; avatar_url: string | null } | null>(null)
  const [inviting, setInviting] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Check if form data has changed
  const hasChanges = useMemo(() => {
    return (
      formData.name !== school.name ||
      formData.username !== school.username ||
      formData.address !== (school.address || '') ||
      formData.hudl_url !== (school.hudl_url || '') ||
      formData.x_url !== (school.x_url || '')
    )
  }, [formData, school])

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setCurrentUserId(session.user.id)
      }
    }
    getCurrentUser()
  }, [supabase])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/high-school/${school.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update school')
      }

      router.refresh()
      alert('School page updated successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to update school')
    } finally {
      setLoading(false)
    }
  }

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

  const handleSelectUser = (user: { user_id: string; full_name: string | null; username: string | null; avatar_url: string | null }) => {
    setSelectedUser(user)
    setSearchQuery(user.full_name || user.username || '')
    setShowSearchResults(false)
    setSearchResults([])
  }

  const handleCancelSelection = () => {
    setSelectedUser(null)
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
  }

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUser) {
      setError('Please select a user to invite')
      return
    }

    setInviting(true)
    setError(null)

    try {
      const response = await fetch(`/api/high-school/${school.id}/admin/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: selectedUser.user_id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      setSearchQuery('')
      setSelectedUser(null)
      setSearchResults([])
      alert('Admin invite sent successfully!')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const handleLeaveAdmin = async () => {
    if (admins.length === 1) {
      alert('You must add another admin before leaving. Please invite another admin first.')
      return
    }

    if (!confirm('Are you sure you want to leave this school page? You will no longer have admin access.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/high-school/${school.id}/admin/leave`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to leave school')
      }

      alert('You have successfully left the school page.')
      router.push('/profile')
    } catch (err: any) {
      setError(err.message || 'Failed to leave school')
      setLoading(false)
    }
  }

  const handleRemoveAdmin = async (userIdToRemove: string) => {
    if (!confirm('Are you sure you want to remove this admin? They will no longer have access to manage this school page.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/high-school/${school.id}/admin/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userIdToRemove }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove admin')
      }

      alert('Admin removed successfully.')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to remove admin')
      setLoading(false)
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to cancel this invite?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/high-school/${school.id}/admin/invite/${inviteId}/cancel`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel invite')
      }

      alert('Invite cancelled successfully.')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to cancel invite')
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this school page? This action cannot be undone.')) {
      return
    }

    if (!confirm('This will delete all roster data, evaluations, and settings. Are you absolutely sure?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/high-school/${school.id}/delete`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete school')
      }

      router.push('/profile')
    } catch (err: any) {
      alert(err.message || 'Failed to delete school')
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-black mb-6">Page Settings</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* School Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-black mb-4">School Information</h2>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              School Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">got1.app/high-school/</span>
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
                  })
                }
                required
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">HUDL Link</label>
            <input
              type="url"
              value={formData.hudl_url}
              onChange={(e) => setFormData({ ...formData, hudl_url: e.target.value })}
              placeholder="https://www.hudl.com/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">X (Twitter) Link</label>
            <input
              type="url"
              value={formData.x_url}
              onChange={(e) => setFormData({ ...formData, x_url: e.target.value })}
              placeholder="https://x.com/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
            />
          </div>

          {hasChanges && (
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </form>
      </div>

      {/* Admin Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-black mb-4">Admins ({admins.length}/2)</h2>
        <div className="space-y-3 mb-4">
          {admins.map((admin) => (
            <div key={admin.user_id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {admin.profile?.avatar_url && isMeaningfulAvatar(admin.profile.avatar_url) ? (
                  <Image
                    src={admin.profile.avatar_url}
                    alt={admin.profile.full_name || 'Admin'}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getGradientForId(
                      admin.user_id
                    )}`}
                  >
                    {admin.profile?.full_name?.charAt(0) || '?'}
                  </div>
                )}
                <p className="font-semibold text-black">{admin.profile?.full_name || 'Unknown'}</p>
              </div>
              {admin.user_id === currentUserId ? (
                <button
                  onClick={handleLeaveAdmin}
                  disabled={loading || admins.length === 1}
                  className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={admins.length === 1 ? 'Add another admin before leaving' : 'Leave this school page'}
                >
                  Leave
                </button>
              ) : (
                <button
                  onClick={() => handleRemoveAdmin(admin.user_id)}
                  disabled={loading || admins.length === 1}
                  className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={admins.length === 1 ? 'Cannot remove the last admin' : 'Remove this admin'}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="mt-6 mb-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Pending Invites</h3>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {invite.profile?.avatar_url && isMeaningfulAvatar(invite.profile.avatar_url) ? (
                      <Image
                        src={invite.profile.avatar_url}
                        alt={invite.profile.full_name || 'Invitee'}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getGradientForId(
                          invite.user_id || invite.email
                        )}`}
                      >
                        {(invite.profile?.full_name || invite.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-black">
                        {invite.profile?.full_name || invite.email}
                      </p>
                      {invite.profile?.username && (
                        <p className="text-sm text-gray-500">@{invite.profile.username}</p>
                      )}
                      {!invite.profile && (
                        <p className="text-sm text-gray-500">{invite.email}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    disabled={loading}
                    className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {admins.length < 2 && (
          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-3">
              Admins must be existing users on the platform (scouts or basic users, not players). Search for a user by name or username.
            </p>
            <form onSubmit={handleInviteAdmin} className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1" ref={searchRef}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) {
                        setShowSearchResults(true)
                      }
                    }}
                    placeholder="Search by name or username..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                  />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                  </div>
                )}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.user_id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                      >
                        {user.avatar_url && isMeaningfulAvatar(user.avatar_url) ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.full_name || 'User'}
                            width={40}
                            height={40}
                            className="rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${getGradientForId(
                              user.user_id
                            )}`}
                          >
                            {(user.full_name || '?').charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-black truncate">{user.full_name || 'Unknown'}</p>
                          {user.username && (
                            <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
                    No users found. Make sure they are not players.
                  </div>
                )}
                </div>
                <button
                  type="submit"
                  disabled={inviting || !selectedUser}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  {inviting ? 'Sending...' : 'Invite Admin'}
                </button>
              </div>
              {selectedUser && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedUser.avatar_url && isMeaningfulAvatar(selectedUser.avatar_url) ? (
                      <Image
                        src={selectedUser.avatar_url}
                        alt={selectedUser.full_name || 'User'}
                        width={40}
                        height={40}
                        className="rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${getGradientForId(
                          selectedUser.user_id
                        )}`}
                      >
                        {(selectedUser.full_name || '?').charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-black">
                        Selected: {selectedUser.full_name || 'Unknown'}
                        {selectedUser.username && <span className="text-gray-500 ml-2">@{selectedUser.username}</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelSelection}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-red-800 mb-4">Danger Zone</h2>
        <p className="text-red-700 text-sm mb-4">
          Deleting your school page will permanently remove all data, including roster, evaluations, and settings.
        </p>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Deleting...' : 'Delete School Page'}
        </button>
      </div>
    </div>
  )
}

