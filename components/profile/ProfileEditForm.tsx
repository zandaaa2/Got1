'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Modal from '@/components/shared/Modal'
import HudlLinkSelector from '@/components/shared/HudlLinkSelector'
import CollegeSelector from '@/components/profile/CollegeSelector'
import PositionMultiSelect from '@/components/profile/PositionMultiSelect'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getGradientForId } from '@/lib/gradients'
import Cropper, { type Area } from 'react-easy-crop'

// US States list
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
  'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
]

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

interface ProfileEditFormProps {
  profile: any
  isNewProfile?: boolean
  pendingScoutApplication?: any | null
}

export default function ProfileEditForm({ profile, isNewProfile = false, pendingScoutApplication = null }: ProfileEditFormProps) {
  const router = useRouter()
  const supabase = createClient()
  
  // Track if we've already attempted to fix the role to prevent infinite loops
  const roleFixAttempted = useRef(false)
  
  // Determine if we should show player fields
  // Show player fields if role is 'player' OR if profile has player data (hudl_link, position, school)
  // This handles cases where role might be 'user' but the profile has player data
  // Never show player fields for scouts
  const shouldShowPlayerFields = profile?.role !== 'scout' && 
    (profile?.role === 'player' || 
    !!(profile?.hudl_link || profile?.position || profile?.school || profile?.graduation_year))
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(isMeaningfulAvatar(profile.avatar_url) ? profile.avatar_url : null)
  const [showAgeRestrictionModal, setShowAgeRestrictionModal] = useState(false)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  // Player position state (array for PositionMultiSelect component)
  const [playerPositions, setPlayerPositions] = useState<string[]>(() => {
    if (profile.role === 'player' || shouldShowPlayerFields) {
      // Try to load from positions JSONB array first (new format)
      try {
        if (profile.positions && typeof profile.positions === 'string') {
          const parsed = JSON.parse(profile.positions)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed
          }
        } else if (Array.isArray(profile.positions) && profile.positions.length > 0) {
          return profile.positions
        }
        // Fall back to single position field (backward compatibility)
        if (profile.position) {
          return [profile.position]
        }
      } catch {
        // If parsing fails, fall back to single position field
        if (profile.position) {
          return [profile.position]
        }
      }
    }
    return []
  })
  
  // Auto-fix role if profile has player data but role is 'user'
  // Only run once per profile to prevent infinite loops
  useEffect(() => {
    // Only attempt fix if we haven't tried before and role is 'user' with player data
    if (profile?.role === 'user' && shouldShowPlayerFields && !roleFixAttempted.current && profile?.user_id) {
      roleFixAttempted.current = true
      console.log('⚠️ ProfileEditForm - Auto-fixing role from "user" to "player"')
      
      const fixRole = async () => {
        try {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'player' })
            .eq('user_id', profile.user_id)
          
          if (updateError) {
            console.error('❌ ProfileEditForm - Error auto-fixing role:', updateError)
            roleFixAttempted.current = false // Allow retry on error
          } else {
            console.log('✅ ProfileEditForm - Role auto-fixed to "player"')
            // Use router.refresh() instead of window.location.reload() to avoid full page reload
            router.refresh()
          }
        } catch (error) {
          console.error('❌ ProfileEditForm - Error in fixRole:', error)
          roleFixAttempted.current = false // Allow retry on error
        }
      }
      
      fixRole()
    }
    // Only depend on profile.user_id to prevent re-running when other profile fields change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.user_id, profile?.role])
  
  // Determine if we're editing a child profile (parent editing their child)
  // This happens when profile.user_id !== session.user.id
  const [isEditingChild, setIsEditingChild] = useState(false)
  const [targetUserId, setTargetUserId] = useState<string | null>(null)
  
  useEffect(() => {
    const checkEditingChild = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && profile?.user_id && profile.user_id !== session.user.id) {
        setIsEditingChild(true)
        setTargetUserId(profile.user_id)
        console.log('🔍 ProfileEditForm - Editing child profile:', { 
          profileUserId: profile.user_id, 
          sessionUserId: session.user.id 
        })
      } else {
        setIsEditingChild(false)
        setTargetUserId(null)
      }
    }
    checkEditingChild()
  }, [profile?.user_id, supabase])
  
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
    username: profile.username || '',
    bio: profile.bio || '',
    avatar_url: isMeaningfulAvatar(profile.avatar_url) ? profile.avatar_url : '',
    organization: profile.organization || '',
    price_per_eval: profile.price_per_eval?.toString() || '99',
    social_link: profile.social_link || '',
    turnaround_time: profile.turnaround_time || '72 hrs',
    birthday: profile.birthday || '', // Date in YYYY-MM-DD format - locked once set
    // Scout application fields
    position: profile.position || '',
    positionArray: profile.position ? (typeof profile.position === 'string' && profile.position.includes(',') ? profile.position.split(',').map((p: string) => p.trim()) : [profile.position].filter(Boolean)) : [],
    work_history: profile.work_history || '',
    additional_info: profile.additional_info || '',
    // Player fields
    hudl_link: profile.hudl_link || '',
    hudl_links: getInitialHudlLinks(),
    school: profile.school || '',
    graduation_year: profile.graduation_year?.toString() || '',
    graduation_month: profile.graduation_month ? String(profile.graduation_month) : '',
    parent_name: profile.parent_name || '',
    sport: profile.sport || '',
    // Player stats fields
    gpa: profile.gpa?.toString() || '',
    weight: profile.weight?.toString() || '',
    height: profile.height || '',
    forty_yard_dash: (profile.forty_yard_dash || profile.forty_yd_dash)?.toString() || '',
    bench_max: profile.bench_max?.toString() || '',
    squat_max: profile.squat_max?.toString() || '',
    clean_max: profile.clean_max?.toString() || '',
    state: profile.state || '',
    classification: profile.classification || '',
    // Scout fields
    sports: (Array.isArray(profile.sports) ? profile.sports : []) as string[],
    // Parent fields
    email: profile.email || '',
    phone: profile.phone || '',
  })

  // Sync form data when profile prop changes (important after onboarding completes)
  useEffect(() => {
    // Update all form fields when profile changes
    setFormData((prev) => ({
      ...prev,
      full_name: profile.full_name || prev.full_name,
      username: profile.username || prev.username,
      bio: profile.bio || prev.bio,
      avatar_url: isMeaningfulAvatar(profile.avatar_url) ? profile.avatar_url : prev.avatar_url,
      organization: profile.organization || prev.organization,
      price_per_eval: profile.price_per_eval?.toString() || prev.price_per_eval,
      social_link: profile.social_link || prev.social_link,
      turnaround_time: profile.turnaround_time || prev.turnaround_time,
      birthday: profile.birthday || prev.birthday,
      position: profile.position || prev.position,
      work_history: profile.work_history || prev.work_history,
      additional_info: profile.additional_info || prev.additional_info,
      hudl_link: profile.hudl_link || prev.hudl_link,
      hudl_links: (() => {
        if (profile.hudl_links && Array.isArray(profile.hudl_links) && profile.hudl_links.length > 0) {
          return profile.hudl_links.map((hl: any) => ({
            link: hl.link || hl.url || '',
            sport: hl.sport || ''
          }))
        }
        if (profile.hudl_link) {
          return [{ link: profile.hudl_link, sport: profile.sport || '' }]
        }
        return prev.hudl_links.length > 0 ? prev.hudl_links : [{ link: '', sport: '' }]
      })(),
      school: profile.school || prev.school,
      graduation_year: profile.graduation_year?.toString() || prev.graduation_year,
      graduation_month: profile.graduation_month ? String(profile.graduation_month) : prev.graduation_month,
      parent_name: profile.parent_name || prev.parent_name,
      sport: profile.sport || prev.sport,
      gpa: profile.gpa?.toString() || prev.gpa,
      weight: profile.weight?.toString() || prev.weight,
      height: profile.height || prev.height,
      forty_yard_dash: profile.forty_yd_dash?.toString() || prev.forty_yard_dash,
      bench_max: profile.bench_max?.toString() || prev.bench_max,
      squat_max: profile.squat_max?.toString() || prev.squat_max,
      clean_max: profile.clean_max?.toString() || prev.clean_max,
      state: profile.state || prev.state,
      classification: profile.classification || prev.classification,
      sports: Array.isArray(profile.sports) ? profile.sports : prev.sports,
      email: profile.email || prev.email,
      phone: profile.phone || prev.phone,
    }))
    
    // Update player positions if profile has positions
    if (profile.role === 'player') {
      try {
        if (profile.positions && typeof profile.positions === 'string') {
          const parsed = JSON.parse(profile.positions)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPlayerPositions(parsed)
          }
        } else if (Array.isArray(profile.positions) && profile.positions.length > 0) {
          setPlayerPositions(profile.positions)
        } else if (profile.position) {
          setPlayerPositions([profile.position])
        }
      } catch {
        if (profile.position) {
          setPlayerPositions([profile.position])
        }
      }
    }
    
    // Update avatar preview
    if (isMeaningfulAvatar(profile.avatar_url)) {
      setAvatarPreview(profile.avatar_url)
    }
    
    // Username suggestion
    if (!profile.username && profile.full_name) {
      const suggestion = normalizeUsername(profile.full_name.replace(/\s+/g, ''))
      if (suggestion && !formData.username) {
        setFormData((prev) => ({ ...prev, username: suggestion }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile.id, 
    profile.role, 
    profile.full_name, 
    profile.username,
    profile.birthday,
    profile.social_link, 
    profile.hudl_link, 
    profile.hudl_links,
    profile.position,
    profile.positions,
    profile.school, 
    profile.graduation_year,
    profile.graduation_month,
    profile.gpa, 
    profile.weight, 
    profile.height,
    profile.forty_yd_dash,
    profile.bench_max,
    profile.squat_max,
    profile.clean_max,
    profile.state,
    profile.classification,
    profile.avatar_url
  ])

  /**
   * Handles input field changes and updates form state.
   * Prevents changes to birthday if it's already locked.
   *
   * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>} e - The input change event
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'birthday' && isBirthdayLocked) {
      return
    }
    
    if (name === 'username') {
      const normalized = normalizeUsername(value)
      setFormData((prev) => ({ ...prev, username: normalized }))
      return
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Helper function to create an image element from URL
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', error => reject(error))
      image.src = url
    })

  // Get cropped image as blob
  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) throw new Error('No 2d context')

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'))
          return
        }
        resolve(blob)
      }, 'image/jpeg', 0.95)
    })
  }

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const handleCropConfirm = async () => {
    if (!imageToCrop || !croppedAreaPixels) return

    setUploading(true)
    setError(null)

    try {
      // Get cropped image as blob directly
      const blob = await getCroppedImg(imageToCrop, croppedAreaPixels)
      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' })

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Create a unique filename using user ID and timestamp
      const fileName = `${session.user.id}-${Date.now()}.jpg`
      const filePath = fileName

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
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

      // Immediately save the avatar to the database so it updates across the platform
      try {
        const userIdToUpdate = targetUserId || session.user.id
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('user_id', userIdToUpdate)

        if (updateError) {
          console.error('Failed to update avatar in database:', updateError)
          // Don't throw - we still want to update the form state
        } else {
          // Force refresh the router to update all cached data
          router.refresh()
          
          // Also trigger a window location refresh as a fallback to ensure all parts update
          // Use a small delay to let router.refresh() happen first
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.location.reload()
            }
          }, 500)
        }
      } catch (updateErr) {
        console.error('Error updating avatar:', updateErr)
        // Continue anyway - form state is updated
      }

      // Clean up blob URL
      if (imageToCrop.startsWith('blob:')) {
        URL.revokeObjectURL(imageToCrop)
      }

      setCropModalOpen(false)
      setImageToCrop(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
    } catch (err: any) {
      setError(err.message || 'Failed to crop and upload image')
    } finally {
      setUploading(false)
    }
  }

  /**
   * Handles profile picture file selection and opens crop modal.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - The file input change event
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

    // Create preview URL and open crop modal
    const imageUrl = URL.createObjectURL(file)
    setImageToCrop(imageUrl)
    setCropModalOpen(true)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setError(null)

    // Reset file input so same file can be selected again
    e.target.value = ''
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
      } else if (isNewProfile && !isEditingChild) {
        // Require birthday for new profiles (but not when parent is editing child)
        setError('Birthday is required. You must be at least 16 years old to use this platform.')
        setLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

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

      const userIdToCheck = targetUserId || session.user.id
      const { data: existingUsername } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', normalizedUsername)
        .neq('user_id', userIdToCheck)
        .maybeSingle()

      if (existingUsername) {
        setError('That username is already taken. Please choose another.')
        setLoading(false)
        return
      }

      // Role-specific validation
      if (profile.role === 'player') {
        if (!formData.social_link || formData.social_link.trim() === '') {
          setError('Social media link is required for players.')
          setLoading(false)
          return
        }
        const validHudlLinks = formData.hudl_links.filter(
          (hl: HudlLink) => hl.link && hl.link.trim() !== ''
        )
        if (validHudlLinks.length === 0) {
          setError('At least one film link (HUDL, QwikCut, or YouTube) is required for players.')
          setLoading(false)
          return
        }
        if (!formData.position || formData.position.trim() === '') {
          setError('Position is required for players.')
          setLoading(false)
          return
        }
        if (!formData.school || formData.school.trim() === '') {
          setError('School is required for players.')
          setLoading(false)
          return
        }
        if (!formData.graduation_month) {
          setError('Graduation month is required for players.')
          setLoading(false)
          return
        }
        if (!formData.graduation_year) {
          setError('Graduation year is required for players.')
          setLoading(false)
          return
        }
      } else if (profile.role === 'scout') {
        if (!formData.organization || formData.organization.trim() === '') {
          setError('Organization is required for scouts.')
          setLoading(false)
          return
        }
        if (!formData.position || formData.position.trim() === '') {
          setError('Position is required for scouts.')
          setLoading(false)
          return
        }
        if (!formData.social_link || formData.social_link.trim() === '') {
          setError('Social media link is required for scouts.')
          setLoading(false)
          return
        }
      } else if (profile.role === 'user' && pendingScoutApplication) {
        // Validate scout application fields for users with pending applications
        if (!formData.organization || formData.organization.trim() === '') {
          setError('Organization is required.')
          setLoading(false)
          return
        }
        if (!formData.position || formData.position.trim() === '') {
          setError('Position is required.')
          setLoading(false)
          return
        }
        if (!formData.work_history || formData.work_history.trim() === '') {
          setError('Work history is required.')
          setLoading(false)
          return
        }
      }

      const sanitizedAvatar = isMeaningfulAvatar(formData.avatar_url) ? formData.avatar_url : null

      const updateData: any = {
        full_name: formData.full_name,
        username: normalizedUsername,
        avatar_url: sanitizedAvatar,
        updated_at: new Date().toISOString(),
      }

      // Only update birthday if it's not already locked
      if (!isBirthdayLocked && formData.birthday) {
        updateData.birthday = formData.birthday
      }

      // USER role - no bio, clear all role-specific fields
      // BUT if they have a pending scout application, save those fields to the application
      if (profile.role === 'user') {
        updateData.bio = null
        // Clear role-specific fields for USER (unless they have pending scout application)
        if (!pendingScoutApplication) {
          updateData.organization = null
          updateData.price_per_eval = null
          updateData.turnaround_time = null
          updateData.sports = null
          updateData.hudl_links = null
          updateData.hudl_link = null
          updateData.sport = null
          updateData.position = null
          updateData.school = null
          updateData.graduation_year = null
          updateData.graduation_month = null
          updateData.parent_name = null
          updateData.social_link = null
          updateData.work_history = null
          updateData.additional_info = null
        } else {
          // For users with pending scout applications, save to profile for consistency
          // (even though it won't be used until approved)
          updateData.organization = formData.organization || null
          updateData.position = formData.position || null
          updateData.work_history = formData.work_history || null
          updateData.social_link = formData.social_link || null
          updateData.additional_info = formData.additional_info || null
          // Clear other fields
          updateData.price_per_eval = null
          updateData.turnaround_time = null
          updateData.sports = null
          updateData.hudl_links = null
          updateData.hudl_link = null
          updateData.sport = null
          updateData.school = null
          updateData.graduation_year = null
          updateData.graduation_month = null
          updateData.parent_name = null
          updateData.social_link = null
        }
        // Clear player stats fields for USER role
        updateData.gpa = null
        updateData.weight = null
        updateData.height = null
        updateData.forty_yard_dash = null
        updateData.bench_max = null
        updateData.squat_max = null
        updateData.clean_max = null
        updateData.state = null
        updateData.classification = null
      } else if (profile.role === 'scout') {
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
        // Clear player-specific fields
        updateData.hudl_links = null
        updateData.hudl_link = null
        updateData.sport = null
        updateData.school = null
        updateData.graduation_year = null
        updateData.graduation_month = null
        updateData.parent_name = null
        // Clear player stats fields for SCOUT role
        updateData.gpa = null
        updateData.weight = null
        updateData.height = null
        updateData.forty_yard_dash = null
        updateData.bench_max = null
        updateData.squat_max = null
        updateData.clean_max = null
        updateData.state = null
        updateData.classification = null
      } else if (profile.role === 'parent') {
        updateData.email = formData.email?.trim() || null
        updateData.phone = formData.phone?.trim() || null
      } else if (profile.role === 'player') {
        // Save hudl_links as JSONB array, filtering out empty entries
        const validHudlLinks = formData.hudl_links
          .filter((hl: HudlLink) => hl.link && hl.link.trim() !== '')
          .map((hl: HudlLink) => ({ link: hl.link.trim(), sport: hl.sport || null }))
        updateData.hudl_links = validHudlLinks.length > 0 ? validHudlLinks : null
        // Keep old hudl_link for backward compatibility (use first link if exists)
        updateData.hudl_link = validHudlLinks.length > 0 ? validHudlLinks[0].link : null
        updateData.sport = validHudlLinks.length > 0 ? (validHudlLinks[0].sport || null) : null
        // Save positions as JSONB array (new format for multiple positions)
        updateData.positions = playerPositions.length > 0 ? JSON.stringify(playerPositions) : null
        // Keep position field with first position for backward compatibility
        updateData.position = playerPositions.length > 0 ? playerPositions[0] : null
        updateData.school = formData.school || null
        updateData.graduation_year = formData.graduation_year ? parseInt(formData.graduation_year.toString()) : null
        updateData.graduation_month = formData.graduation_month ? parseInt(formData.graduation_month.toString()) : null
        updateData.parent_name = formData.parent_name || null
        updateData.social_link = formData.social_link || null
        updateData.bio = formData.bio || null
        // Player stats fields
        updateData.gpa = formData.gpa ? parseFloat(formData.gpa.toString()) : null
        updateData.weight = formData.weight ? parseInt(formData.weight.toString()) : null
        updateData.height = formData.height || null
        updateData.forty_yard_dash = formData.forty_yard_dash ? parseFloat(formData.forty_yard_dash.toString()) : null
        updateData.bench_max = formData.bench_max ? parseInt(formData.bench_max.toString()) : null
        updateData.squat_max = formData.squat_max ? parseInt(formData.squat_max.toString()) : null
        updateData.clean_max = formData.clean_max ? parseInt(formData.clean_max.toString()) : null
        updateData.state = formData.state || null
        updateData.classification = formData.classification || null
        // Clear scout-specific fields
        updateData.organization = null
        updateData.price_per_eval = null
        updateData.turnaround_time = null
        updateData.sports = null
        updateData.work_history = null
        updateData.additional_info = null
      }

      const userIdToUpdate = targetUserId || session.user.id
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userIdToUpdate)

      // If user has a pending scout application, also update it
      if (pendingScoutApplication && !updateError) {
        const { error: appUpdateError } = await supabase
          .from('scout_applications')
          .update({
            current_workplace: formData.organization || '',
            current_position: formData.position || '',
            work_history: formData.work_history || '',
            social_link: formData.social_link || null,
            additional_info: formData.additional_info || '',
          })
          .eq('id', pendingScoutApplication.id)
        
        if (appUpdateError) {
          console.error('Error updating scout application:', appUpdateError)
          // Don't fail the whole save if application update fails
        }
      }

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

      // If editing a child, redirect back to parent's profile page
      // Otherwise, redirect to the profile's own page
      if (isEditingChild) {
        router.push('/profile')
      } else {
        router.push(`/${normalizedUsername}`)
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
      setLoading(false)
    }
  }


  return (
    <div className="max-w-2xl">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
        {/* Profile Info Section */}
        <div>
          <h2 className="text-xl font-bold text-black mb-4 md:mb-6">Profile Info</h2>
          <div className="space-y-4 md:space-y-6">
            {/* Profile Picture */}
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
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-300 flex items-center justify-center">
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
                      <div className={`w-full h-full flex items-center justify-center text-2xl font-semibold text-white ${getGradientForId(profile.user_id || profile.id || profile.username || profile.full_name || 'profile')}`}>
                        {formData.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Full Name */}
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

            {/* Username */}
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
              <p className="mt-1 text-sm text-gray-600">
                This will be your public link: got1.app/<span className="font-semibold">{formData.username || 'username'}</span>. Use letters, numbers, or underscores.
              </p>
            </div>

            {/* Birthday - Hidden when editing a child player */}
            {!isEditingChild && (
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
            )}

          </div>
        </div>

        {/* Player Info Section */}
        {shouldShowPlayerFields && (
          <div>
            <h2 className="text-xl font-bold text-black mb-4 md:mb-6">Player Info</h2>
            <div className="space-y-4 md:space-y-6">
              <div>
                <label htmlFor="social_link" className="block text-sm font-medium text-black mb-2">
                  Social Media Link <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  id="social_link"
                  name="social_link"
                  value={formData.social_link}
                  onChange={handleChange}
                  required
                  placeholder="https://x.com/yourhandle or https://instagram.com/yourhandle"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <HudlLinkSelector
                  hudlLinks={formData.hudl_links}
                  onChange={(links) => setFormData((prev) => ({ ...prev, hudl_links: links }))}
                />
              </div>

              <div>
                <PositionMultiSelect
                  selectedPositions={playerPositions}
                  onChange={(positions) => {
                    setPlayerPositions(positions)
                    // Update formData.position with first selected position for backward compatibility
                    setFormData((prev) => ({ ...prev, position: positions.length > 0 ? positions[0] : '' }))
                  }}
                  label="Position"
                />
              </div>

              <div>
                <label htmlFor="school" className="block text-sm font-medium text-black mb-2">
                  School <span className="text-red-500">*</span>
                </label>
                <CollegeSelector
                  value={formData.school}
                  onChange={(value) => setFormData((prev) => ({ ...prev, school: value }))}
                  placeholder="Search for your school"
                />
              </div>

              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="graduation_month" className="block text-sm font-medium text-black mb-2">
                      Graduation Month <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="graduation_month"
                      name="graduation_month"
                      value={formData.graduation_month}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="">Select Month</option>
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="graduation_year" className="block text-sm font-medium text-black mb-2">
                      Graduation Year <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="graduation_year"
                      name="graduation_year"
                      value={formData.graduation_year}
                      onChange={handleChange}
                      required
                      min={new Date().getFullYear()}
                      max={new Date().getFullYear() + 10}
                      placeholder="2025"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
              </div>


              {/* Player Stats Section */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-bold text-black mb-4">Athletic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label htmlFor="gpa" className="block text-sm font-medium text-black mb-2">
                      GPA
                    </label>
                    <input
                      type="number"
                      id="gpa"
                      name="gpa"
                      value={formData.gpa}
                      onChange={handleChange}
                      min="0"
                      max="4"
                      step="0.01"
                      placeholder="3.5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label htmlFor="weight" className="block text-sm font-medium text-black mb-2">
                      Weight (lbs)
                    </label>
                    <input
                      type="number"
                      id="weight"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      min="0"
                      placeholder="185"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label htmlFor="height" className="block text-sm font-medium text-black mb-2">
                      Height
                    </label>
                    <input
                      type="text"
                      id="height"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      placeholder="6'2 or 74 inches"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label htmlFor="forty_yard_dash" className="block text-sm font-medium text-black mb-2">
                      40-Yard Dash (seconds)
                    </label>
                    <input
                      type="number"
                      id="forty_yard_dash"
                      name="forty_yard_dash"
                      value={formData.forty_yard_dash}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="4.5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label htmlFor="bench_max" className="block text-sm font-medium text-black mb-2">
                      Bench Max (lbs)
                    </label>
                    <input
                      type="number"
                      id="bench_max"
                      name="bench_max"
                      value={formData.bench_max}
                      onChange={handleChange}
                      min="0"
                      placeholder="225"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label htmlFor="squat_max" className="block text-sm font-medium text-black mb-2">
                      Squat Max (lbs)
                    </label>
                    <input
                      type="number"
                      id="squat_max"
                      name="squat_max"
                      value={formData.squat_max}
                      onChange={handleChange}
                      min="0"
                      placeholder="315"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label htmlFor="clean_max" className="block text-sm font-medium text-black mb-2">
                      Clean Max (lbs)
                    </label>
                    <input
                      type="number"
                      id="clean_max"
                      name="clean_max"
                      value={formData.clean_max}
                      onChange={handleChange}
                      min="0"
                      placeholder="245"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-black mb-2">
                      State
                    </label>
                    <select
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="">Select State</option>
                      {US_STATES.map((stateName) => (
                        <option key={stateName} value={stateName}>
                          {stateName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="classification" className="block text-sm font-medium text-black mb-2">
                      Classification
                    </label>
                    <select
                      id="classification"
                      name="classification"
                      value={formData.classification}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="">Select Classification</option>
                      <option value="1A">1A</option>
                      <option value="2A">2A</option>
                      <option value="3A">3A</option>
                      <option value="4A">4A</option>
                      <option value="5A">5A</option>
                      <option value="6A">6A</option>
                      <option value="7A">7A</option>
                      <option value="8A">8A</option>
                    </select>
                  </div>
                </div>
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
                  placeholder="Tell us about yourself..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </div>
        )}

        {/* Scout Info Section - Show for scouts OR users with pending scout applications */}
        {(profile.role === 'scout' || pendingScoutApplication) && (
          <div>
            <h2 className="text-xl font-bold text-black mb-4 md:mb-6">Scout Info</h2>
            <div className="space-y-4 md:space-y-6">
              {/* Social link only required for approved scouts, not for pending applications */}
              {profile.role === 'scout' && (
                <div>
                  <label htmlFor="social_link" className="block text-sm font-medium text-black mb-2">
                    Social Media Link <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    id="social_link"
                    name="social_link"
                    value={formData.social_link}
                    onChange={handleChange}
                    required
                    placeholder="https://x.com/yourhandle or https://instagram.com/yourhandle"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Organization <span className="text-red-500">*</span>
                </label>
                <CollegeSelector
                  value={formData.organization}
                  onChange={(value) => setFormData((prev) => ({ ...prev, organization: value }))}
                  placeholder="Search or type college name..."
                />
                <p className="mt-1 text-sm text-gray-600">
                  Select from major colleges or type a custom organization (e.g., "Dallas Cowboys", "Auburn Player Personnel")
                </p>
              </div>

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-black mb-2">
                  Position <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Player Personnel Assistant, Director of Recruiting"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Social link field - show only for users with pending applications (not approved scouts) */}
              {pendingScoutApplication && profile.role !== 'scout' && (
              <div>
                <label htmlFor="social_link" className="block text-sm font-medium text-black mb-2">
                  Social Media Link
                </label>
                <input
                  type="url"
                  id="social_link"
                  name="social_link"
                  value={formData.social_link}
                  onChange={handleChange}
                  placeholder="https://x.com/yourhandle or https://instagram.com/yourhandle"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              )}

              <div>
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

              <div>
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
          </div>
        )}

        {/* Parent Info Section */}
        {profile.role === 'parent' && (
          <div>
            <h2 className="text-xl font-bold text-black mb-4 md:mb-6">Contact Information</h2>
            <div className="space-y-4 md:space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="mt-1 text-sm text-gray-600">
                  Your contact email address.
                </p>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-black mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="mt-1 text-sm text-gray-600">
                  Your contact phone number.
                </p>
              </div>
            </div>
          </div>
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

      {/* Crop Modal */}
      {cropModalOpen && imageToCrop && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-black mb-4">Crop Your Photo</h3>
            <div className="relative w-full mb-4" style={{ height: '400px', background: '#333' }}>
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="round"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-black mb-2">
                Zoom: {Math.round(zoom * 100)}%
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCropModalOpen(false)
                  if (imageToCrop.startsWith('blob:')) {
                    URL.revokeObjectURL(imageToCrop)
                  }
                  setImageToCrop(null)
                  setCrop({ x: 0, y: 0 })
                  setZoom(1)
                  setCroppedAreaPixels(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-black font-medium"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleCropConfirm}
                disabled={uploading || !croppedAreaPixels}
                className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

