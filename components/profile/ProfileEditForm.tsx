'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Modal from '@/components/shared/Modal'
import { SportSelector, MultiSportSelector } from '@/components/shared/SportSelector'
import HudlLinkSelector from '@/components/shared/HudlLinkSelector'

interface ProfileEditFormProps {
  profile: any
  isNewProfile?: boolean
}

export default function ProfileEditForm({ profile, isNewProfile = false }: ProfileEditFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null)
  const [showAgeRestrictionModal, setShowAgeRestrictionModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  // Check if birthday is already set (locked)
  const isBirthdayLocked = !!profile.birthday

  // Initialize hudl_links - migrate from old hudl_link field if needed
  const getInitialHudlLinks = () => {
    if (profile.hudl_links && Array.isArray(profile.hudl_links) && profile.hudl_links.length > 0) {
      return profile.hudl_links.map((hl: any) => ({
        link: hl.link || hl.url || '',
        sport: hl.sport || ''
      }))
    }
    // Migrate from old hudl_link field
    if (profile.hudl_link) {
      return [{ link: profile.hudl_link, sport: profile.sport || '' }]
    }
    return [{ link: '', sport: '' }]
  }

  // Form state based on role
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    bio: profile.bio || '',
    avatar_url: profile.avatar_url || '',
    organization: profile.organization || '',
    price_per_eval: profile.price_per_eval?.toString() || '99',
    social_link: profile.social_link || '',
    turnaround_time: profile.turnaround_time || '72 hrs',
    birthday: profile.birthday || '', // Date in YYYY-MM-DD format - locked once set
    // Scout application fields
    position: profile.position || '',
    work_history: profile.work_history || '',
    additional_info: profile.additional_info || '',
    // Player fields
    hudl_link: profile.hudl_link || '',
    hudl_links: getInitialHudlLinks(),
    school: profile.school || '',
    graduation_year: profile.graduation_year?.toString() || '',
    parent_name: profile.parent_name || '',
    sport: profile.sport || '',
    // Scout fields
    sports: profile.sports || [],
  })

  /**
   * Handles input field changes and updates form state.
   * Prevents changes to birthday if it's already locked.
   *
   * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} e - The input change event
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Prevent changes to birthday if it's locked
    if (name === 'birthday' && isBirthdayLocked) {
      return
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  /**
   * Handles profile picture file selection and upload to Supabase Storage.
   * Uploads the image to the 'avatars' bucket and updates the avatar URL.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - The file input change event
   * @returns {Promise<void>}
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
      // File path is just the filename since we're uploading to the 'avatars' bucket
      const filePath = fileName

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        // If bucket doesn't exist or upload fails, provide helpful error
        if (uploadError.message.includes('Bucket') || uploadError.message.includes('not found')) {
          throw new Error('Storage bucket not configured. Please create an "avatars" bucket in Supabase Storage.')
        }
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update form state and preview
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }))
      setAvatarPreview(publicUrl)
    } catch (err: any) {
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploading(false)
      // Reset file input so same file can be selected again
      e.target.value = ''
    }
  }

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

  /**
   * Handles form submission to update the user's profile.
   * Updates profile data including avatar URL, name, bio, and role-specific fields.
   * Validates age requirement (16+) before submission.
   *
   * @param {React.FormEvent} e - The form submission event
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate age requirement (16+)
      if (formData.birthday) {
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
      } else if (isNewProfile) {
        // Require birthday for new profiles
        setError('Birthday is required. You must be at least 16 years old to use this platform.')
        setLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const updateData: any = {
        full_name: formData.full_name,
        avatar_url: formData.avatar_url || null,
        updated_at: new Date().toISOString(),
      }

      // Only update birthday if it's not already locked
      if (!isBirthdayLocked && formData.birthday) {
        updateData.birthday = formData.birthday
      }

      if (profile.role === 'scout') {
        updateData.organization = formData.organization || null
        updateData.price_per_eval = formData.price_per_eval ? parseFloat(formData.price_per_eval.toString()) : null
        updateData.social_link = formData.social_link || null
        updateData.turnaround_time = formData.turnaround_time || null
        updateData.position = formData.position || null
        updateData.work_history = formData.work_history || null
        updateData.additional_info = formData.additional_info || null
        updateData.sports = Array.isArray(formData.sports) ? formData.sports : []
        // Bio is not available for scouts
        updateData.bio = null
      } else {
        // Save hudl_links as JSONB array, filtering out empty entries
        const validHudlLinks = formData.hudl_links
          .filter(hl => hl.link && hl.link.trim() !== '')
          .map(hl => ({ link: hl.link.trim(), sport: hl.sport || null }))
        updateData.hudl_links = validHudlLinks.length > 0 ? validHudlLinks : null
        // Keep old hudl_link for backward compatibility (use first link if exists)
        updateData.hudl_link = validHudlLinks.length > 0 ? validHudlLinks[0].link : null
        updateData.sport = validHudlLinks.length > 0 ? (validHudlLinks[0].sport || null) : null
        updateData.position = formData.position || null
        updateData.school = formData.school || null
        updateData.graduation_year = formData.graduation_year ? parseInt(formData.graduation_year.toString()) : null
        updateData.parent_name = formData.parent_name || null
        updateData.social_link = formData.social_link || null
        updateData.bio = formData.bio || null
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', session.user.id)

      if (updateError) throw updateError

      // Send welcome email if this is a new profile (first save)
      // Check if profile was just created or if it's the first time user has saved
      // We detect first save by checking if the profile was created very recently (within last minute)
      // and has minimal data (no full_name set yet, or it matches the auto-created one)
      const profileCreatedAt = profile?.created_at ? new Date(profile.created_at) : null
      const now = new Date()
      const isRecentlyCreated = profileCreatedAt && (now.getTime() - profileCreatedAt.getTime()) < 60000 // Within 1 minute
      const hasMinimalData = !profile?.full_name || profile.full_name.trim() === ''
      const isFirstSave = isNewProfile || (isRecentlyCreated && hasMinimalData)
      
      console.log('Welcome email check:', {
        isNewProfile,
        isRecentlyCreated,
        hasMinimalData,
        isFirstSave,
        profileCreatedAt: profileCreatedAt?.toISOString(),
        currentFullName: profile?.full_name,
        newFullName: formData.full_name,
      })
      
      if (isFirstSave) {
        try {
          console.log('📧 Sending welcome email for new profile...')
          const { data: { user } } = await supabase.auth.getUser()
          if (user?.email) {
            console.log('📧 Calling welcome email API for:', user.email)
            const response = await fetch('/api/user/welcome', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userEmail: user.email,
                userName: formData.full_name || profile?.full_name || 'there',
              }),
            })
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              console.error('❌ Welcome email API error:', response.status, errorData)
            } else {
              const result = await response.json().catch(() => ({}))
              console.log('✅ Welcome email API response:', result)
            }
          } else {
            console.warn('⚠️  Could not send welcome email - no user email found')
          }
        } catch (emailError) {
          console.error('❌ Error sending welcome email:', emailError)
          // Don't block the redirect if email fails
        }
      } else {
        console.log('ℹ️  Profile already exists and has been saved before, skipping welcome email')
      }

      router.push(`/profile/${profile.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
      setLoading(false)
    }
  }


  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-6">Edit Profile</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        {/* Profile Picture Section */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Profile Picture
          </label>
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1">
              <label
                htmlFor="avatar_upload"
                className={`inline-block px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span className="text-black font-medium">
                  {uploading ? 'Uploading...' : 'Choose Image'}
                </span>
                <input
                  type="file"
                  id="avatar_upload"
                  name="avatar_upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-sm text-gray-600">
                Select an image from your device. Max size: 5MB. This will appear in the top right corner and on your profile page.
              </p>
              {uploading && (
                <p className="mt-1 text-sm text-blue-600">Uploading image...</p>
              )}
            </div>
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-300 bg-gray-200 flex items-center justify-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <span className="text-gray-600 text-2xl font-semibold">
                    {formData.full_name?.charAt(0).toUpperCase() || '?'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

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
          {isNewProfile && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm leading-relaxed">
                *if you're a scout, you'll fill out the remaining information on your scout application - scroll down to save changes.
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="birthday" className="block text-sm font-medium text-black mb-2">
            Birthday * {isNewProfile && <span className="text-red-600">(Required - Must be 16+)</span>}
            {isBirthdayLocked && <span className="text-gray-500 text-xs ml-2">(Cannot be changed)</span>}
          </label>
          <input
            type="date"
            id="birthday"
            name="birthday"
            value={formData.birthday}
            onChange={handleChange}
            required={isNewProfile}
            disabled={isBirthdayLocked}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black ${
              isBirthdayLocked ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
          {!isBirthdayLocked && (
            <p className="mt-1 text-sm text-gray-600">
              You must be at least 16 years old to use this platform.
            </p>
          )}
          {formData.birthday && !isBirthdayLocked && (() => {
            const age = calculateAge(formData.birthday)
            return age !== null && (
              <p className={`mt-1 text-sm ${age < 16 ? 'text-red-600' : 'text-green-600'}`}>
                Age: {age} {age < 16 ? '(Must be 16 or older)' : 'years old'}
              </p>
            )
          })()}
        </div>

        {profile.role === 'scout' ? (
          <>
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-black mb-2">
                Organization
              </label>
              <input
                type="text"
                id="organization"
                name="organization"
                value={formData.organization}
                onChange={handleChange}
                placeholder="e.g., Auburn University Player Personnel"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label htmlFor="price_per_eval" className="block text-sm font-medium text-black mb-2">
                Price per Evaluation (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  id="price_per_eval"
                  name="price_per_eval"
                  value={formData.price_per_eval}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  placeholder="499"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <p className="mt-1 text-sm text-gray-600">
                This is the price players will pay for your evaluation service.
              </p>
            </div>

            <div>
              <label htmlFor="social_link" className="block text-sm font-medium text-black mb-2">
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

            <div>
              <label htmlFor="turnaround_time" className="block text-sm font-medium text-black mb-2">
                Turnaround Time
              </label>
              <input
                type="text"
                id="turnaround_time"
                name="turnaround_time"
                value={formData.turnaround_time}
                onChange={handleChange}
                placeholder="e.g., 24hr turnaround"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Scout Info Section */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-xl font-bold text-black mb-4">Scout Info</h2>
              
              <div className="mb-6">
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

              <div className="mt-4">
                <label htmlFor="work_history" className="block text-sm font-medium text-black mb-2">
                  Work History
                </label>
                <textarea
                  id="work_history"
                  name="work_history"
                  value={formData.work_history}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Please provide a brief overview of your work history in player personnel, recruiting, or related roles..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="additional_info" className="block text-sm font-medium text-black mb-2">
                  Additional Information
                </label>
                <textarea
                  id="additional_info"
                  name="additional_info"
                  value={formData.additional_info}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Any additional information you'd like to share..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <HudlLinkSelector
                hudlLinks={formData.hudl_links}
                onChange={(links) => setFormData((prev) => ({ ...prev, hudl_links: links }))}
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
                placeholder="e.g., Quarterback"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label htmlFor="school" className="block text-sm font-medium text-black mb-2">
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
              <label htmlFor="graduation_year" className="block text-sm font-medium text-black mb-2">
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
              <label htmlFor="parent_name" className="block text-sm font-medium text-black mb-2">
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

            <div>
              <label htmlFor="social_link" className="block text-sm font-medium text-black mb-2">
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

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-black mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm md:text-base"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-black text-black rounded-lg hover:bg-gray-50"
          >
            Cancel
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

