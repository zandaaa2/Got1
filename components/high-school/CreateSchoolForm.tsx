'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { isReferralFeatureActive } from '@/lib/high-school/utils'
import Cropper, { type Area } from 'react-easy-crop'

export default function CreateSchoolForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    address: '',
    referral_school_id: '',
    logo_url: '',
  })
  const [referralSchools, setReferralSchools] = useState<any[]>([])
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  // Load referral schools if feature is active
  const loadReferralSchools = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('high_schools')
        .select('id, name, username')
        .eq('admin_status', 'approved')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading referral schools:', error)
        // If table doesn't exist yet, just continue without referral schools
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return
        }
      }

      if (data && data.length > 0) {
        setReferralSchools(data)
      } else {
        // If no schools found, still show the dropdown (empty)
        setReferralSchools([])
      }
    } catch (err) {
      console.error('Error loading referral schools:', err)
      // Silently fail - referral schools are optional
    }
  }

  useEffect(() => {
    if (isReferralFeatureActive()) {
      loadReferralSchools()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const imageUrl = reader.result as string
      setImageToCrop(imageUrl)
      setCropModalOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCropConfirm = async () => {
    if (!imageToCrop || !croppedAreaPixels) return

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const blob = await getCroppedImg(imageToCrop, croppedAreaPixels)
      const file = new File([blob], 'cropped-logo.jpg', { type: 'image/jpeg' })

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Create a unique filename using timestamp and user ID
      const fileName = `school-${session.user.id}-${Date.now()}.jpg`
      const filePath = fileName

      // Upload file to Supabase Storage (using avatars bucket for now)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        if (uploadError.message.includes('Bucket') || uploadError.message.includes('not found')) {
          throw new Error('Storage bucket not configured. Please create an "avatars" bucket in Supabase Storage.')
        }
        if (uploadError.message.includes('already exists')) {
          // If file exists, try with a different name
          const retryFileName = `school-${session.user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`
          const { error: retryError } = await supabase.storage
            .from('avatars')
            .upload(retryFileName, file, {
              cacheControl: '3600',
              upsert: false
            })
          
          if (retryError) {
            throw retryError
          }
          
          // Get public URL for retry
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(retryFileName)
          
          setFormData(prev => ({ ...prev, logo_url: publicUrl }))
          setLogoPreview(publicUrl)
        } else {
          throw uploadError
        }
      } else {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        setFormData(prev => ({ ...prev, logo_url: publicUrl }))
        setLogoPreview(publicUrl)
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
      console.error('Logo upload error:', err)
      setError(err.message || 'Failed to upload logo')
      // Don't close the modal on error so user can try again
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Don't submit if logo is still uploading
    if (uploading) {
      setError('Please wait for logo upload to complete')
      return
    }
    
    // Allow submission even if crop modal is open - cropping is optional
    // User can cancel crop and submit without logo, or close modal and submit
    
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('School name is required')
      }
      
      if (!formData.username.trim()) {
        throw new Error('Username is required')
      }

      // Create school
      const response = await fetch('/api/high-school/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          username: formData.username.trim(),
          address: formData.address.trim() || null,
          referral_school_id: formData.referral_school_id || null,
          logo_url: formData.logo_url || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create school')
      }

      if (data.success) {
        // Redirect to school page
        router.push(`/high-school/${data.school.username}`)
      } else {
        throw new Error('Failed to create school')
      }
    } catch (err: any) {
      console.error('Submit error:', err)
      setError(err.message || 'Failed to create school')
      setLoading(false)
    }
  }

  const handleUsernameChange = (value: string) => {
    // Convert to lowercase, remove spaces, allow only alphanumeric, hyphens, underscores
    const cleaned = value
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9_-]/g, '')
    setFormData({ ...formData, username: cleaned })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-black mb-2">
          School Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          placeholder="e.g., Lincoln High School"
        />
      </div>

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-black mb-2">
          Username <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">got1.app/high-school/</span>
          <input
            type="text"
            id="username"
            value={formData.username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            required
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent font-mono"
            placeholder="lincoln-high"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Lowercase letters, numbers, hyphens, and underscores only
        </p>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-black mb-2">
          Address
        </label>
        <input
          type="text"
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          placeholder="123 Main St, City, State 12345"
        />
      </div>

      <div>
        <label htmlFor="logo" className="block text-sm font-medium text-black mb-2">
          School Logo (Optional)
        </label>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-300">
              <img
                src={logoPreview}
                alt="School logo"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
              <span className="text-gray-400 text-xs">No logo</span>
            </div>
          )}
          <div className="flex-1">
            <input
              type="file"
              id="logo"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-900 file:cursor-pointer disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload a square logo for your school (will be cropped to circle)
            </p>
          </div>
        </div>
      </div>

      {isReferralFeatureActive() && (
        <div>
          <label htmlFor="referral_school_id" className="block text-sm font-medium text-black mb-2">
            Referred By (Optional)
          </label>
          {referralSchools.length > 0 ? (
            <>
              <select
                id="referral_school_id"
                value={formData.referral_school_id}
                onChange={(e) => setFormData({ ...formData, referral_school_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="">Select a school...</option>
                {referralSchools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                If another school referred you, select them to earn them a $20 referral bonus.
              </p>
            </>
          ) : (
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
              <p className="text-sm">No schools available yet. Be the first to create a high school page!</p>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || uploading || !formData.name || !formData.username}
        className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Creating...' : uploading ? 'Uploading...' : 'Create School Page'}
      </button>

      {/* Crop Modal */}
      {cropModalOpen && imageToCrop && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-black mb-4">Crop Your Logo</h3>
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
                type="button"
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
                type="button"
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
    </form>
  )
}

