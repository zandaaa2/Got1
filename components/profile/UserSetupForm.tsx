'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Modal from '@/components/shared/Modal'
import { isMeaningfulAvatar } from '@/lib/avatar'
import AccountCreatedAnimation from '@/components/profile/AccountCreatedAnimation'

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

interface UserSetupFormProps {
  userEmail: string
  userName: string
  userAvatar: string
}

export default function UserSetupForm({
  userEmail,
  userName,
  userAvatar,
}: UserSetupFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAgeRestrictionModal, setShowAgeRestrictionModal] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  /**
   * Handles user sign out
   */
  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await supabase.auth.signOut()
      // Redirect to sign-in page
      window.location.href = '/auth/signin'
    } catch (error: any) {
      console.error('Sign out error:', error)
      setError('Failed to sign out. Please try again.')
      setSigningOut(false)
    }
  }

  const initialUsername = normalizeUsername(userName || '')
  const [avatarUrl, setAvatarUrl] = useState<string>(userAvatar || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(isMeaningfulAvatar(userAvatar) ? userAvatar : null)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    full_name: userName || '',
    username: initialUsername,
    birthday: '', // Date in YYYY-MM-DD format
  })

  useEffect(() => {
    if (!formData.username && formData.full_name) {
      setFormData((prev) => ({ ...prev, username: normalizeUsername(formData.full_name) }))
    }
  }, [formData.full_name, formData.username])

  /**
   * Calculates age from a birthday date string.
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

  /**
   * Handles profile picture file selection and upload to Supabase Storage.
   */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Create a unique filename using user ID and timestamp
      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`
      const filePath = fileName

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
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
      // Validate required fields
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

      // Check if username is already taken
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

      // CRITICAL FIX: Check if profile already exists with wrong role and fix it immediately
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (existingProfile && existingProfile.role === 'player') {
        console.log('⚠️ UserSetupForm - Found existing profile with role=player, fixing to user immediately')
        const { error: fixError } = await supabase
          .from('profiles')
          .update({ role: 'user' })
          .eq('id', existingProfile.id)
        
        if (fixError) {
          console.error('❌ UserSetupForm - Failed to fix existing profile role:', fixError)
        } else {
          console.log('✅ UserSetupForm - Fixed existing profile role from player to user')
        }
      }

      // Sanitize avatar URL
      const sanitizedAvatar = isMeaningfulAvatar(avatarUrl) ? avatarUrl : null

      // CRITICAL: Always create profile with role='user' initially
      // The role will only change if user explicitly selected one on role-selection page
      const profileData: any = {
        user_id: session.user.id,
        role: 'user', // Always start as 'user' - role only changes when explicitly selected
        full_name: formData.full_name.trim(),
        username: normalizedUsername,
        avatar_url: sanitizedAvatar,
        birthday: formData.birthday,
        updated_at: new Date().toISOString(),
      }

      console.log('🔍 UserSetupForm - Attempting to insert profile with role:', profileData.role)
      console.log('🔍 UserSetupForm - Full profileData:', JSON.stringify(profileData, null, 2))
      
      const { data: insertedData, error: insertError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select('id, role')
        .single()

      if (insertError) {
        console.error('❌ UserSetupForm - Insert error:', insertError)
        console.error('❌ UserSetupForm - Error code:', insertError.code)
        console.error('❌ UserSetupForm - Error message:', insertError.message)
        
        // If profile already exists, update it
        if (insertError.code === '23505') { // Unique violation
          console.log('⚠️ UserSetupForm - Profile already exists, updating instead')
          
          // CRITICAL: Always force role to 'user' when updating existing profile
          // This ensures any profile created elsewhere (with wrong role) gets fixed
          const { data: updatedData, error: updateError } = await supabase
            .from('profiles')
            .update({
              full_name: profileData.full_name,
              username: profileData.username,
              avatar_url: profileData.avatar_url,
              birthday: profileData.birthday,
              role: 'user', // ALWAYS set to 'user' - role only changes on role-selection page
              updated_at: profileData.updated_at,
            })
            .eq('user_id', session.user.id)
            .select('id, role')
            .single()

          if (updateError) {
            console.error('❌ UserSetupForm - Update error:', updateError)
            throw updateError
          }
          
          // Verify the role was actually set correctly
          if (updatedData?.role !== 'user') {
            console.error('❌ CRITICAL: Profile update returned wrong role! Expected "user", got:', updatedData?.role)
            // Force fix it
            await supabase
              .from('profiles')
              .update({ role: 'user' })
              .eq('id', updatedData.id)
          }
          
          console.log('✅ UserSetupForm - Profile updated, role:', updatedData?.role)
        } else {
          throw insertError
        }
      } else {
        console.log('✅ UserSetupForm - Profile inserted successfully, role:', insertedData?.role)
        
        // Verify the role was actually set correctly
        if (insertedData?.role !== 'user') {
          console.error('❌ CRITICAL: Profile was created with wrong role! Expected "user", got:', insertedData?.role)
          // Force update to correct role
          const { error: fixError } = await supabase
            .from('profiles')
            .update({ role: 'user' })
            .eq('id', insertedData.id)
          
          if (fixError) {
            console.error('❌ Failed to fix role:', fixError)
          } else {
            console.log('✅ Fixed role back to "user"')
          }
        }
      }

      // Clear any role selection from localStorage (we're going straight to profile for onboarding)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selected_role')
      }

      // Show success animation, then redirect to profile
      setShowSuccessAnimation(true)
      setLoading(false)
    } catch (error: any) {
      console.error('Error creating user profile:', error)
      setError(error.message || 'Failed to create profile. Please try again.')
      setLoading(false)
    }
  }

  const handleAnimationComplete = () => {
    router.push('/profile')
    router.refresh()
  }

  return (
    <>
      {showSuccessAnimation && (
        <AccountCreatedAnimation onComplete={handleAnimationComplete} />
      )}
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">Account info</h1>
        <p className="text-gray-600 mb-8">
          Let's start with the basics. You can add more details about being a player or scout later.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
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
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer disabled:opacity-50"
                />
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
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
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
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
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
              onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              required
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
            />
            <p className="text-xs text-gray-500 mt-1">
              You must be at least 16 years old to use this platform.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating Profile...' : 'Continue'}
            </button>
            
            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut || loading}
              className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {signingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </form>
      </div>

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

