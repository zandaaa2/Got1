'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Modal from '@/components/shared/Modal'
import { SportSelector, MultiSportSelector } from '@/components/shared/SportSelector'
import HudlLinkSelector from '@/components/shared/HudlLinkSelector'
import CollegeSelector from '@/components/profile/CollegeSelector'
import { isMeaningfulAvatar } from '@/lib/avatar'
import Image from 'next/image'

interface HudlLink {
  link: string
  sport: string
}

const normalizeUsername = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 30)
}

const RESERVED_USERNAMES = new Set(["profile", "profiles", "browse", "teams", "team", "api", "terms-of-service", "privacy-policy", "login", "signup", "my-evals", "evaluations", "stripe", "auth", "admin", "settings", "money", "marketing"])

interface ProfileSetupFormProps {
  userEmail: string
  userName: string
  userAvatar: string
  referrerId?: string
}

export default function ProfileSetupForm({
  userEmail,
  userName,
  userAvatar,
  referrerId,
}: ProfileSetupFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAgeRestrictionModal, setShowAgeRestrictionModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [role, setRole] = useState<'player' | 'scout' | 'parent' | 'user' | null>(null)
  const [parentAction, setParentAction] = useState<'create' | 'link' | null>(null) // For parent: create new player or link existing
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')
  const [playerSearchResults, setPlayerSearchResults] = useState<any[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [searchingPlayer, setSearchingPlayer] = useState(false)
  const initialUsername = normalizeUsername(userName || '')
  const sanitizedAvatar = isMeaningfulAvatar(userAvatar) ? userAvatar : null

  const [formData, setFormData] = useState({
    full_name: userName,
    username: initialUsername,
    birthday: '', // Date in YYYY-MM-DD format
    referrer_id: '', // User ID of who referred them
    referrer_username: '', // Username for display
    // Scout fields
    organization: '',
    price_per_eval: '', // Only set for scouts
    social_link: '',
    turnaround_time: '',
    bio: '',
    // Player fields
    hudl_link: '',
    hudl_links: [{ link: '', sport: '' }],
    position: '',
    school: '',
    graduation_year: '',
    parent_name: '',
    sport: '',
    // Scout fields
    sports: [] as string[],
  })
  const [referrerSearchQuery, setReferrerSearchQuery] = useState('')
  const [referrerSearchResults, setReferrerSearchResults] = useState<any[]>([])
  const [showReferrerDropdown, setShowReferrerDropdown] = useState(false)
  const [searchingReferrer, setSearchingReferrer] = useState(false)

  useEffect(() => {
    if (!formData.username && formData.full_name) {
      setFormData((prev) => ({ ...prev, username: normalizeUsername(formData.full_name) }))
    }
  }, [formData.full_name, formData.username])

  // Read stored role from localStorage (set during signup) and pre-select it
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('signup_role')
      if (storedRole && ['player', 'scout', 'parent'].includes(storedRole)) {
        setRole(storedRole as 'player' | 'scout' | 'parent')
        // Clear it after reading so it doesn't persist
        localStorage.removeItem('signup_role')
      }
    }
  }, [])

  // Load referrer info if referrerId is provided
  useEffect(() => {
    if (referrerId && !formData.referrer_username) {
      const loadReferrerInfo = async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, username, full_name')
            .eq('user_id', referrerId)
            .maybeSingle()

          if (profile) {
            setFormData((prev) => ({
              ...prev,
              referrer_id: referrerId,
              referrer_username: profile.username || profile.full_name || 'Unknown',
            }))
            setReferrerSearchQuery(profile.username || profile.full_name || '')
          }
        } catch (error) {
          console.error('Error loading referrer info:', error)
        }
      }
      loadReferrerInfo()
    }
  }, [referrerId, formData.referrer_username, supabase])

  // Search for referrers (approved users in referral program)
  useEffect(() => {
    if (!referrerSearchQuery || referrerSearchQuery.trim().length < 2) {
      setReferrerSearchResults([])
      setShowReferrerDropdown(false)
      return
    }

    const searchReferrers = async () => {
      setSearchingReferrer(true)
      try {
        // Get approved referral applications and their user profiles
        const { data: approvedApplications } = await supabase
          .from('referral_program_applications')
          .select('user_id')
          .eq('status', 'approved')

        if (!approvedApplications || approvedApplications.length === 0) {
          setReferrerSearchResults([])
          setSearchingReferrer(false)
          return
        }

        const approvedUserIds = approvedApplications.map((app: any) => app.user_id)

        if (approvedUserIds.length === 0) {
          setReferrerSearchResults([])
          setSearchingReferrer(false)
          return
        }

        // Search profiles for matching usernames/full names
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, username, full_name, avatar_url')
          .in('user_id', approvedUserIds)
          .or(`username.ilike.%${referrerSearchQuery}%,full_name.ilike.%${referrerSearchQuery}%`)
          .limit(10)

        setReferrerSearchResults(profiles || [])
        setShowReferrerDropdown(profiles ? profiles.length > 0 : false)
      } catch (error) {
        console.error('Error searching referrers:', error)
        setReferrerSearchResults([])
        setShowReferrerDropdown(false)
      } finally {
        setSearchingReferrer(false)
      }
    }

    const timeoutId = setTimeout(searchReferrers, 300)
    return () => clearTimeout(timeoutId)
  }, [referrerSearchQuery, supabase])


  /**
   * Calculates age from a birthday date string.
   * 
   * @param birthday - Date string in YYYY-MM-DD format
   * @returns Age in years, or null if invalid
   */
  const calculateAge = (birthday: string): number | null => {
    if (!birthday) return null
    const birthDate = new Date(birthday)
    if (isNaN(birthDate.getTime())) return null
    
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate age requirement (16+)
      if (!formData.birthday) {
        setError('Birthday is required. You must be at least 16 years old to use this platform.')
        setLoading(false)
        return
      }

      const age = calculateAge(formData.birthday)
      if (age === null) {
        setError('Please enter a valid birthday')
        setLoading(false)
        return
      }
      if (age < 16) {
        setShowAgeRestrictionModal(true)
        setLoading(false)
        return
      }

      const normalizedUsername = normalizeUsername(formData.username || '')
      if (!normalizedUsername) {
        setError('Username is required.')
        setLoading(false)
        return
      }
      if (normalizedUsername.length < 3) {
        setError('Username must be at least 3 characters.')
        setLoading(false)
        return
      }
      if (RESERVED_USERNAMES.has(normalizedUsername)) {
        setError('That username is reserved. Please choose another.')
        setLoading(false)
        return
      }

      const { data: existingUsername } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', normalizedUsername)
        .maybeSingle()

      if (existingUsername) {
        setError('That username is already taken. Please choose another.')
        setLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const profileData: any = {
        user_id: session.user.id,
        role: role || 'user', // Default to 'user' if no role selected
        full_name: formData.full_name || null,
        username: normalizedUsername,
        avatar_url: sanitizedAvatar,
        birthday: formData.birthday || null,
        bio: formData.bio || null,
        updated_at: new Date().toISOString(),
      }

      if (role === 'scout') {
        profileData.organization = formData.organization || null
        profileData.price_per_eval = formData.price_per_eval
          ? parseFloat(formData.price_per_eval)
          : null // Scouts should set their own price, default to null
        profileData.social_link = formData.social_link || null
        profileData.turnaround_time = formData.turnaround_time || null
        profileData.sports = Array.isArray(formData.sports) ? formData.sports : []
      } else if (role === 'parent') {
        // Parent profile - minimal data needed
        // Explicitly set price_per_eval to null for non-scouts
        profileData.price_per_eval = null
      } else if (role === 'player') {
        // Explicitly set price_per_eval to null for non-scouts
        profileData.price_per_eval = null
        // Save hudl_links as JSONB array, filtering out empty entries
        const validHudlLinks = formData.hudl_links
          .filter((hl: HudlLink) => hl.link && hl.link.trim() !== '')
          .map((hl: HudlLink) => ({ link: hl.link.trim(), sport: hl.sport || null }))
        profileData.hudl_links = validHudlLinks.length > 0 ? validHudlLinks : null
        // Keep old hudl_link for backward compatibility (use first link if exists)
        profileData.hudl_link = validHudlLinks.length > 0 ? validHudlLinks[0].link : null
        profileData.sport = validHudlLinks.length > 0 ? (validHudlLinks[0].sport || null) : null
        profileData.position = formData.position || null
        profileData.school = formData.school || null
        profileData.graduation_year = formData.graduation_year
          ? parseInt(formData.graduation_year)
          : null
        profileData.parent_name = formData.parent_name || null
      } else {
        // For 'user' role or null role, explicitly set price_per_eval to null
        profileData.price_per_eval = null
      }
      // If role is null/'user', don't set player or scout specific fields

      // Use upsert to handle both new profiles and updating existing profiles (from UserSetupForm)
      const { error: upsertError, data: upsertedProfile } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        })
        .select()
        .single()

      if (upsertError) throw upsertError

      // Handle parent-specific flow: link to existing player
      if (role === 'parent' && selectedPlayerId) {
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
      }

      // REFERRAL PROCESS TEMPORARILY DISABLED
      // Create referral record if referrer was selected
      /* if (formData.referrer_id && role && (role === 'player' || role === 'scout')) {
        try {
          const referralResponse = await fetch('/api/referrals/select-referrer', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              referrer_id: formData.referrer_id,
              referred_role: role,
            }),
          })

          if (!referralResponse.ok) {
            const errorData = await referralResponse.json()
            console.error('Error creating referral:', errorData.error)
            // Don't block the redirect if referral creation fails
          }
        } catch (referralError) {
          console.error('Error creating referral:', referralError)
          // Don't block the redirect if referral creation fails
        }
      } */

      // Send welcome email (don't block if it fails)
      try {
        if (userEmail) {
          await fetch('/api/user/welcome', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userEmail,
              userName: formData.full_name || userName,
            }),
          })
        }
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError)
        // Don't block the redirect if email fails
      }

      router.push(`/${normalizedUsername}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to create profile')
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    if (name === 'username') {
      const normalized = normalizeUsername(value)
      setFormData((prev) => ({ ...prev, username: normalized }))
      return
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-black mb-6">Complete Your Profile</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            I am a: <span className="text-gray-500 text-xs font-normal">(Optional - you can skip)</span>
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setRole('player')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 ${
                role === 'player'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black hover:bg-gray-50'
              }`}
            >
              Player
            </button>
            <button
              type="button"
              onClick={() => setRole('scout')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 ${
                role === 'scout'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black hover:bg-gray-50'
              }`}
            >
              Scout
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('parent')
                setParentAction(null)
              }}
              className={`flex-1 py-3 px-4 rounded-lg border-2 ${
                role === 'parent'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black hover:bg-gray-50'
              }`}
            >
              Parent
            </button>
            <button
              type="button"
              onClick={() => setRole(null)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 ${
                role === null
                  ? 'bg-gray-200 text-gray-700 border-gray-300'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Skip
            </button>
          </div>
          {role === null && (
            <p className="mt-2 text-xs text-gray-500">
              You can set up your profile later as a player or scout
            </p>
          )}
          {role === 'parent' && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-3">
                As a parent, you can manage your child's player page and purchase evaluations on their behalf.
              </p>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-black">
                  Link to your child's player page:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={playerSearchQuery}
                    onChange={async (e) => {
                      const query = e.target.value
                      setPlayerSearchQuery(query)
                      if (query.length >= 2) {
                        setSearchingPlayer(true)
                        const { data } = await supabase
                          .from('profiles')
                          .select('id, user_id, username, full_name, avatar_url')
                          .eq('role', 'player')
                          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
                          .limit(10)
                        setPlayerSearchResults(data || [])
                        setSearchingPlayer(false)
                      } else {
                        setPlayerSearchResults([])
                      }
                    }}
                    placeholder="Search for player username or name..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
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
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Player selected
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-2">
                  Note: You can link a player page after creating your parent profile, or create a new player page from your parent dashboard. The player page must already exist to link it here.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Common Fields */}
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-black mb-2">
            Full Name *
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-black mb-2">
            Username *
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            pattern="[a-z0-9_-]+"
            minLength={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="mt-1 text-xs text-gray-600">
            This becomes your public link: got1.app/{formData.username || 'username'}
          </p>
        </div>

        <div>
          <label htmlFor="birthday" className="block text-sm font-medium text-black mb-2">
            Birthday * <span className="text-red-600">(Must be 16+)</span>
          </label>
          <input
            type="date"
            id="birthday"
            name="birthday"
            value={formData.birthday}
            onChange={handleChange}
            required
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="mt-1 text-sm text-gray-600">
            You must be at least 16 years old to use this platform.
          </p>
          {formData.birthday && (() => {
            const age = calculateAge(formData.birthday)
            return age !== null && (
              <p className={`mt-1 text-sm ${age < 16 ? 'text-red-600' : 'text-green-600'}`}>
                Age: {age} {age < 16 ? '(Must be 16 or older)' : 'years old'}
              </p>
            )
          })()}
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-black mb-2">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* REFERRAL PROCESS TEMPORARILY DISABLED */}
        {/* Referrer Selection - Optional */}
        {/* <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="referrer" className="block text-sm font-medium text-black">
              Referred by (Optional)
            </label>
            {!formData.referrer_id && (
              <button
                type="button"
                onClick={() => {
                  // Skip referral selection - clear search and close dropdown
                  setReferrerSearchQuery('')
                  setReferrerSearchResults([])
                  setShowReferrerDropdown(false)
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Skip
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-2">
            If someone referred you to Got1, search for their username or name to give them credit!
          </p>
          {formData.referrer_id ? (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-gray-700">
                Referred by: <strong>{formData.referrer_username}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, referrer_id: '', referrer_username: '' }))
                  setReferrerSearchQuery('')
                  setReferrerSearchResults([])
                }}
                className="ml-auto text-blue-600 hover:text-blue-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                id="referrer"
                value={referrerSearchQuery}
                onChange={(e) => {
                  setReferrerSearchQuery(e.target.value)
                  setShowReferrerDropdown(true)
                }}
                onFocus={() => {
                  if (referrerSearchResults.length > 0) {
                    setShowReferrerDropdown(true)
                  }
                }}
                placeholder="Search for username or name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
              {showReferrerDropdown && referrerSearchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {referrerSearchResults.map((profile: any) => (
                    <button
                      key={profile.user_id}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          referrer_id: profile.user_id,
                          referrer_username: profile.username || profile.full_name || 'Unknown',
                        }))
                        setReferrerSearchQuery(profile.username || profile.full_name || '')
                        setShowReferrerDropdown(false)
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
                    >
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                          {(profile.full_name || profile.username || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black truncate">
                          {profile.full_name || 'Unknown'}
                        </p>
                        {profile.username && (
                          <p className="text-xs text-gray-500 truncate">@{profile.username}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {referrerSearchQuery && referrerSearchQuery.length >= 2 && !searchingReferrer && referrerSearchResults.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  No approved referrers found with that name.
                </p>
              )}
            </div>
          )}
        </div> */}

        {/* Scout-specific fields */}
        {role === 'scout' && (
          <>
            <div>
              <label
                htmlFor="price_per_eval"
                className="block text-sm font-medium text-black mb-2"
              >
                Price per Evaluation (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  id="price_per_eval"
                  name="price_per_eval"
                  value={formData.price_per_eval}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  placeholder="99"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Default is $99. You can change this later in your profile settings.
              </p>
            </div>

            <div>
              <label
                htmlFor="turnaround_time"
                className="block text-sm font-medium text-black mb-2"
              >
                Turnaround Time
              </label>
              <input
                type="text"
                id="turnaround_time"
                name="turnaround_time"
                value={formData.turnaround_time}
                onChange={handleChange}
                placeholder="e.g., 72 hrs"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label
                htmlFor="social_link"
                className="block text-sm font-medium text-black mb-2"
              >
                Social Media Link (X/Twitter, etc.)
              </label>
              <input
                type="url"
                id="social_link"
                name="social_link"
                value={formData.social_link}
                onChange={handleChange}
                placeholder="https://x.com/yourhandle"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Scout Info Section */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-xl font-bold text-black mb-4">Scout Info</h2>

              <div className="space-y-6">
                <div>
                  <CollegeSelector
                    value={formData.organization}
                    onChange={(value) => setFormData((prev) => ({ ...prev, organization: value }))}
                    label="Organization"
                    placeholder="Search or type college name..."
                  />
                  <p className="mt-1 text-sm text-gray-600">
                    Select from major colleges or type a custom organization (e.g., "Dallas Cowboys", "Auburn Player Personnel")
                  </p>
                </div>

                <div>
                  <MultiSportSelector
                    selectedSports={Array.isArray(formData.sports) ? formData.sports : []}
                    onToggle={(sport) => {
                      const currentSports = Array.isArray(formData.sports) ? formData.sports : []
                      const newSports = currentSports.includes(sport)
                        ? currentSports.filter(s => s !== sport)
                        : [...currentSports, sport]
                      setFormData((prev) => ({ ...prev, sports: newSports }))
                    }}
                    label="Sports You Evaluate For"
                  />
                </div>

                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-black mb-2">
                    Position
                  </label>
                  <input
                    type="text"
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    placeholder="e.g., Player Personnel Assistant, Director of Recruiting"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Player-specific fields */}
        {role === 'player' && (
          <>
            <div>
              <HudlLinkSelector
                hudlLinks={formData.hudl_links}
                onChange={(links) => setFormData((prev) => ({ ...prev, hudl_links: links }))}
              />
            </div>

            <div>
              <label
                htmlFor="position"
                className="block text-sm font-medium text-black mb-2"
              >
                Position
              </label>
              <input
                type="text"
                id="position"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="e.g., Quarterback"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label
                htmlFor="school"
                className="block text-sm font-medium text-black mb-2"
              >
                School
              </label>
              <input
                type="text"
                id="school"
                name="school"
                value={formData.school}
                onChange={handleChange}
                placeholder="e.g., Niceville High School"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label
                htmlFor="graduation_year"
                className="block text-sm font-medium text-black mb-2"
              >
                Graduation Year
              </label>
              <input
                type="number"
                id="graduation_year"
                name="graduation_year"
                value={formData.graduation_year}
                onChange={handleChange}
                min="2020"
                max="2030"
                placeholder="2027"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label
                htmlFor="parent_name"
                className="block text-sm font-medium text-black mb-2"
              >
                Parent Name (if run by parent)
              </label>
              <input
                type="text"
                id="parent_name"
                name="parent_name"
                value={formData.parent_name}
                onChange={handleChange}
                placeholder="e.g., Brandon Huff"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Creating Profile...' : 'Complete Setup'}
          </button>
        </div>
      </form>

      {/* Age Restriction Modal */}
      <Modal
        isOpen={showAgeRestrictionModal}
        onClose={() => setShowAgeRestrictionModal(false)}
        title="Age Restriction"
      >
        <div className="text-center">
          <p className="text-black text-lg mb-4">
            We don't serve users at that age. Please have your parent sign up for you and be a parent on your account.
          </p>
          <button
            onClick={() => setShowAgeRestrictionModal(false)}
            className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 font-medium"
          >
            Understood
          </button>
        </div>
      </Modal>
    </div>
  )
}

