'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getGradientForId } from '@/lib/gradients'

const normalizeUsername = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 30)
}

const RESERVED_USERNAMES = new Set([
  'profile', 'profiles', 'browse', 'teams', 'team', 'api', 'terms-of-service',
  'privacy-policy', 'login', 'signup', 'my-evals', 'evaluations', 'stripe',
  'auth', 'admin', 'settings', 'money', 'marketing'
])

interface CombinedScoutApplicationFormProps {
  userEmail: string
  userName: string
  userAvatar: string
}

export default function CombinedScoutApplicationForm({
  userEmail,
  userName,
  userAvatar,
}: CombinedScoutApplicationFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const initialUsername = normalizeUsername(userName || '')
  const [avatarUrl, setAvatarUrl] = useState<string>(userAvatar || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(isMeaningfulAvatar(userAvatar) ? userAvatar : null)
  const [uploading, setUploading] = useState(false)

  // Username availability checking state
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean
    available: boolean | null
    message: string | null
  }>({ checking: false, available: null, message: null })

  // User profile fields
  const [userFormData, setUserFormData] = useState({
    full_name: userName || '',
    username: initialUsername,
    birthday: '',
  })

  // Scout application fields
  const [scoutFormData, setScoutFormData] = useState({
    current_workplace: '',
    current_position: '',
    work_history: '',
    additional_info: '',
  })

  useEffect(() => {
    if (!userFormData.username && userFormData.full_name) {
      setUserFormData((prev) => ({ ...prev, username: normalizeUsername(userFormData.full_name) }))
    }
  }, [userFormData.full_name, userFormData.username])

  // Real-time username availability checking
  useEffect(() => {
    const normalizedUsername = normalizeUsername(userFormData.username.trim())
    
    // Reset status if username is empty
    if (!normalizedUsername) {
      setUsernameStatus({ checking: false, available: null, message: null })
      return
    }

    // Don't check if it's too short
    if (normalizedUsername.length < 3) {
      setUsernameStatus({ 
        checking: false, 
        available: false, 
        message: 'Username must be at least 3 characters' 
      })
      return
    }

    // Check if it's reserved
    if (RESERVED_USERNAMES.has(normalizedUsername)) {
      setUsernameStatus({ 
        checking: false, 
        available: false, 
        message: 'This username is reserved' 
      })
      return
    }

    // Debounce the database check
    const timeoutId = setTimeout(async () => {
      setUsernameStatus({ checking: true, available: null, message: 'Checking availability...' })
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setUsernameStatus({ 
            checking: false, 
            available: null, 
            message: 'Please sign in to check username' 
          })
          return
        }

        const { data: existingUsername, error: checkError } = await supabase
          .from('profiles')
          .select('id, user_id')
          .eq('username', normalizedUsername)
          .maybeSingle()
        
        if (checkError) {
          console.error('Error checking username:', checkError)
          setUsernameStatus({ 
            checking: false, 
            available: null, 
            message: 'Error checking username' 
          })
          return
        }

        // If username exists and belongs to a different user, it's taken
        // If it belongs to the current user, it's available (they can keep their own username)
        if (existingUsername && existingUsername.user_id !== session.user.id) {
          setUsernameStatus({ 
            checking: false, 
            available: false, 
            message: 'This username is already taken' 
          })
        } else {
          // Username is available
          setUsernameStatus({ 
            checking: false, 
            available: true, 
            message: 'Username is available' 
          })
        }
      } catch (err) {
        console.error('Error checking username:', err)
        setUsernameStatus({ 
          checking: false, 
          available: null, 
          message: 'Error checking username' 
        })
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [userFormData.username, supabase])

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`
      const filePath = fileName

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
      setAvatarPreview(publicUrl)
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      setError(error.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Validate user fields
      if (!userFormData.full_name || userFormData.full_name.trim() === '') {
        setError('Name is required.')
        setLoading(false)
        return
      }

      if (!userFormData.birthday) {
        setError('Birthday is required. You must be at least 16 years old to use this platform.')
        setLoading(false)
        return
      }

      const age = calculateAge(userFormData.birthday)
      if (age === null) {
        setError('Please enter a valid birthday')
        setLoading(false)
        return
      }
      if (age < 16) {
        setError('You must be at least 16 years old to use this platform.')
        setLoading(false)
        return
      }

      const normalizedUsername = normalizeUsername(userFormData.username || '')
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

      // Validate scout fields
      if (!scoutFormData.current_workplace.trim()) {
        setError('Current workplace is required.')
        setLoading(false)
        return
      }

      if (!scoutFormData.current_position.trim()) {
        setError('Current position is required.')
        setLoading(false)
        return
      }

      if (!scoutFormData.work_history.trim()) {
        setError('Work history is required.')
        setLoading(false)
        return
      }

      // Check if username is already taken
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (existingProfile && existingProfile.username !== normalizedUsername) {
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
      }

      // Create or update profile with user info
      // IMPORTANT: Always set role to 'user' - users do NOT become scouts until their
      // application is approved by an admin via /api/scout-application/[id]/decision
      const profileData: any = {
        user_id: session.user.id,
        full_name: userFormData.full_name.trim(),
        username: normalizedUsername,
        birthday: userFormData.birthday,
        role: 'user', // CRITICAL: Must stay as 'user' until scout application is approved
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      }

      if (existingProfile) {
        // Update existing profile - ensure role remains 'user' even if it was set incorrectly
        // This prevents any edge case where the user might have been assigned scout role prematurely
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            ...profileData,
            role: 'user', // Explicitly set to 'user' to ensure it doesn't become 'scout' prematurely
          })
          .eq('user_id', session.user.id)

        if (updateError) throw updateError
      } else {
        // Create new profile with role 'user'
        profileData.created_at = new Date().toISOString()
        const { error: createError } = await supabase
          .from('profiles')
          .insert([profileData])

        if (createError) throw createError
      }

      // Submit scout application
      const { error: submitError } = await fetch('/api/scout-application/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_workplace: scoutFormData.current_workplace,
          current_position: scoutFormData.current_position,
          work_history: scoutFormData.work_history,
          additional_info: scoutFormData.additional_info,
        }),
      }).then((res) => res.json())

      if (submitError) throw new Error(submitError)

      // Redirect to profile page
      router.push('/profile')
      router.refresh()
    } catch (err: any) {
      console.error('Error submitting form:', err)
      setError(err.message || 'Failed to submit. Please try again.')
      setLoading(false)
    }
  }

  const handleUserFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'username') {
      // Normalize username as they type
      const normalized = normalizeUsername(value)
      setUserFormData((prev) => ({ ...prev, [name]: normalized }))
    } else {
      setUserFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleScoutFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setScoutFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-normal text-black mb-6">
        Become a Scout
      </h1>

      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-black text-sm">
          Complete your profile information and submit your scout application to get started.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* User Information Section */}
        <section>
          <h2 className="text-xl font-normal text-black mb-4">Profile Information</h2>
          
          <div className="space-y-6">
            {/* Profile Picture */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Profile Picture
              </label>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt="Profile"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-3xl font-semibold text-white ${getGradientForId(userEmail || 'profile')}`}>
                      {userFormData.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                    className="text-sm text-gray-600"
                  />
                  {uploading && (
                    <p className="text-xs text-gray-500 mt-1">Uploading...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-medium text-black mb-2"
              >
                Full Name *
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={userFormData.full_name}
                onChange={handleUserFormChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-black mb-2"
              >
                Username *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={userFormData.username}
                  onChange={handleUserFormChange}
                  required
                  className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 ${
                    usernameStatus.available === true
                      ? 'border-green-500 focus:ring-green-500'
                      : usernameStatus.available === false
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-600'
                  }`}
                  placeholder="your-username"
                  minLength={3}
                  maxLength={30}
                />
                {usernameStatus.checking && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                )}
                {!usernameStatus.checking && usernameStatus.available === true && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {!usernameStatus.checking && usernameStatus.available === false && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>
              {usernameStatus.message && (
                <p className={`text-xs mt-1 ${
                  usernameStatus.available === true
                    ? 'text-green-600'
                    : usernameStatus.available === false
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}>
                  {usernameStatus.message}
                </p>
              )}
              {!usernameStatus.message && (
                <p className="text-xs text-gray-500 mt-1">
                  This will be your unique profile URL
                </p>
              )}
            </div>

            {/* Birthday */}
            <div>
              <label
                htmlFor="birthday"
                className="block text-sm font-medium text-black mb-2"
              >
                Birthday *
              </label>
              <input
                type="date"
                id="birthday"
                name="birthday"
                value={userFormData.birthday}
                onChange={handleUserFormChange}
                required
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                You must be at least 16 years old
              </p>
            </div>
          </div>
        </section>

        {/* Scout Application Section */}
        <section>
          <h2 className="text-xl font-normal text-black mb-4">Scout Application</h2>
          
          <div className="space-y-6">
            {/* Current Workplace */}
            <div>
              <label
                htmlFor="current_workplace"
                className="block text-sm font-medium text-black mb-2"
              >
                Current Workplace *
              </label>
              <input
                type="text"
                id="current_workplace"
                name="current_workplace"
                value={scoutFormData.current_workplace}
                onChange={handleScoutFormChange}
                required
                placeholder="e.g., Auburn University, SMU, Dallas Cowboys"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Current Position */}
            <div>
              <label
                htmlFor="current_position"
                className="block text-sm font-medium text-black mb-2"
              >
                Current Position *
              </label>
              <input
                type="text"
                id="current_position"
                name="current_position"
                value={scoutFormData.current_position}
                onChange={handleScoutFormChange}
                required
                placeholder="e.g., Player Personnel Assistant, Director of Recruiting"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Work History */}
            <div>
              <label
                htmlFor="work_history"
                className="block text-sm font-medium text-black mb-2"
              >
                Work History *
              </label>
              <textarea
                id="work_history"
                name="work_history"
                value={scoutFormData.work_history}
                onChange={handleScoutFormChange}
                required
                rows={6}
                placeholder="Please provide a brief overview of your work history in player personnel, recruiting, or related roles..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Additional Information */}
            <div>
              <label
                htmlFor="additional_info"
                className="block text-sm font-medium text-black mb-2"
              >
                Additional Information
              </label>
              <textarea
                id="additional_info"
                name="additional_info"
                value={scoutFormData.additional_info}
                onChange={handleScoutFormChange}
                rows={4}
                placeholder="Any additional information you'd like to share..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </section>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            style={{ backgroundColor: '#233dff' }}
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/discover')}
            className="px-6 py-3 border border-gray-300 text-black rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

