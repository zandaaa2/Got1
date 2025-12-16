'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Modal from '@/components/shared/Modal'
import { isMeaningfulAvatar } from '@/lib/avatar'
import AccountCreatedAnimation from '@/components/profile/AccountCreatedAnimation'
import type { Session } from '@supabase/supabase-js'

// Vivid blue color constant
const VIVID_BLUE = '#233dff'

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

interface Step2BasicInfoProps {
  session: Session
  profile: any
  onComplete: () => void
  onBack?: () => void
}

export default function Step2BasicInfo({ session, profile, onComplete, onBack }: Step2BasicInfoProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAgeRestrictionModal, setShowAgeRestrictionModal] = useState(false)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showLoading, setShowLoading] = useState(false)

  // Get initial values from session or existing profile
  const userName = session.user.user_metadata?.full_name || 
                   session.user.user_metadata?.name || 
                   profile?.full_name || 
                   ''
  const userAvatar = session.user.user_metadata?.avatar_url || 
                     session.user.user_metadata?.picture || 
                     profile?.avatar_url || 
                     ''

  const initialUsername = normalizeUsername(userName || '')
  const [avatarUrl, setAvatarUrl] = useState<string>(isMeaningfulAvatar(userAvatar) ? userAvatar : '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(isMeaningfulAvatar(userAvatar) ? userAvatar : null)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || userName || '',
    username: profile?.username || initialUsername,
    birthday: profile?.birthday || '',
  })

  useEffect(() => {
    // Only set username if it's empty and we have a full name
    // Use a ref to prevent infinite loops
    if (!formData.username && formData.full_name) {
      const normalized = normalizeUsername(formData.full_name)
      if (normalized && normalized !== formData.username) {
        setFormData((prev) => ({ ...prev, username: normalized }))
      }
    }
  }, [formData.full_name]) // Removed formData.username from deps to prevent loop

  // Clear any existing errors when component mounts
  useEffect(() => {
    // Clear error on mount to remove any stale errors
    setError(null)
  }, []) // Empty dependency array means this runs once on mount

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
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) throw new Error('Not authenticated')

      const fileExt = file.name.split('.').pop()
      const fileName = `${currentSession.user.id}-${Date.now()}.${fileExt}`
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
      if (!formData.full_name || formData.full_name.trim() === '') {
        setError('Name is required.')
        setLoading(false)
        return
      }

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

      // Check if username is already taken (by someone else)
      try {
        const { data: existingUsername, error: usernameCheckError } = await supabase
          .from('profiles')
          .select('id, user_id')
          .eq('username', normalizedUsername)
          .maybeSingle()

        if (usernameCheckError) {
          console.error('Error checking username:', usernameCheckError)
          // Don't block if username check fails - let the insert/update handle uniqueness
        } else if (existingUsername && existingUsername.user_id !== session.user.id) {
          setError('That username is already taken. Please choose another.')
          setLoading(false)
          return
        }
      } catch (checkError: any) {
        console.error('Error checking username (catch):', checkError)
        // Continue with profile creation - uniqueness will be enforced by database
      }

      const sanitizedAvatar = isMeaningfulAvatar(avatarUrl) ? avatarUrl : null

      // Create or update profile with role='user' (will be set to player/parent during onboarding)
      const profileData: any = {
        user_id: session.user.id,
        role: 'user', // Default role, will be updated during onboarding
        full_name: formData.full_name.trim(),
        username: normalizedUsername,
        avatar_url: sanitizedAvatar,
        birthday: formData.birthday,
        updated_at: new Date().toISOString(),
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      let result
      if (existingProfile) {
        // Update existing profile
        const { data: updatedData, error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: profileData.full_name,
            username: profileData.username,
            avatar_url: profileData.avatar_url,
            birthday: profileData.birthday,
            role: 'user',
            updated_at: profileData.updated_at,
          })
          .eq('user_id', session.user.id)
          .select('id, role')
          .single()

        if (updateError) {
          throw updateError
        }
        result = updatedData
      } else {
        // Insert new profile
        const { data: insertedData, error: insertError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select('id, role')
          .single()

        if (insertError) {
          // If it's a unique violation, try updating instead
          if (insertError.code === '23505') {
            const { data: updatedData, error: updateError } = await supabase
              .from('profiles')
              .update({
                full_name: profileData.full_name,
                username: profileData.username,
                avatar_url: profileData.avatar_url,
                birthday: profileData.birthday,
                role: 'user',
                updated_at: profileData.updated_at,
              })
              .eq('user_id', session.user.id)
              .select('id, role')
              .single()

            if (updateError) {
              throw updateError
            }
            result = updatedData
          } else {
            throw insertError
          }
        } else {
          result = insertedData
        }
      }

      // Show success animation, then redirect to profile to continue onboarding
      setShowSuccessAnimation(true)
      setLoading(false)
    } catch (error: any) {
      console.error('Error creating user profile:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      })
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to create profile. Please try again.'
      if (error.message) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again. If the problem persists, please refresh the page.'
        } else if (error.message.includes('username') || error.code === '23505') {
          errorMessage = 'That username is already taken. Please choose another.'
        } else if (error.message) {
          errorMessage = error.message
        }
      }
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleAnimationComplete = () => {
    setShowLoading(true)
    setTimeout(() => {
      onComplete()
    }, 500)
  }

  return (
    <>
      {showSuccessAnimation && !showLoading && (
        <AccountCreatedAnimation 
          onComplete={handleAnimationComplete}
          title="Profile Complete!"
          message="Redirecting to continue your profile setup..."
        />
      )}
      {showLoading && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="relative w-12 h-12 mx-auto">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-lg font-medium text-gray-900">Loading...</p>
          </div>
        </div>
      )}
      {!showSuccessAnimation && !showLoading && (
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-black mb-2">Complete Your Profile</h2>
            <p className="text-gray-600">
              We need some basic information to set up your account. This will be used for your profile.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="ml-4 text-red-700 hover:text-red-900 focus:outline-none"
                  aria-label="Dismiss error"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Avatar Upload */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Profile Picture
              </label>
              <div className="flex items-center gap-4">
                {avatarPreview && (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                )}
                {!avatarPreview && (
                  <div className="w-20 h-20 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:text-white file:cursor-pointer disabled:opacity-50"
                  />
                  <style jsx global>{`
                    input[type="file"]::file-selector-button {
                      background-color: ${VIVID_BLUE} !important;
                    }
                    input[type="file"]::file-selector-button:hover {
                      opacity: 0.9;
                    }
                  `}</style>
                  {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-black mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="full_name"
                value={formData.full_name}
                onChange={(e) => {
                  setFormData({ ...formData, full_name: e.target.value })
                  setError(null) // Clear error when user starts typing
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': VIVID_BLUE } as React.CSSProperties}
                required
                placeholder="Enter your full name"
              />
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-black mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="username"
                value={formData.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value })
                  setError(null) // Clear error when user starts typing
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': VIVID_BLUE } as React.CSSProperties}
                required
                placeholder="Choose a username"
                minLength={3}
                maxLength={30}
              />
              <p className="text-xs text-gray-500 mt-1">
                Your username will be visible to others. Only letters, numbers, hyphens, and underscores.
              </p>
            </div>

            {/* Birthday */}
            <div>
              <label htmlFor="birthday" className="block text-sm font-medium text-black mb-2">
                Birthday <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="birthday"
                value={formData.birthday}
                onChange={(e) => {
                  setFormData({ ...formData, birthday: e.target.value })
                  setError(null) // Clear error when user starts typing
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': VIVID_BLUE } as React.CSSProperties}
                required
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
              />
              <p className="text-xs text-gray-500 mt-1">
                You must be at least 16 years old to use this platform.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4 space-y-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full py-3 border border-gray-300 text-black rounded-lg font-medium hover:bg-gray-50"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                style={{ backgroundColor: VIVID_BLUE }}
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Age Restriction Modal */}
      <Modal
        isOpen={showAgeRestrictionModal}
        onClose={() => setShowAgeRestrictionModal(false)}
        title="Age Requirement"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            You must be at least 16 years old to use Got1. If you're a parent or guardian, you can create an account and manage your child's profile.
          </p>
          <button
            onClick={() => setShowAgeRestrictionModal(false)}
            className="w-full py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Understood
          </button>
        </div>
      </Modal>
    </>
  )
}



