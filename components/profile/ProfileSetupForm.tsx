'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Modal from '@/components/shared/Modal'
import { SportSelector, MultiSportSelector } from '@/components/shared/SportSelector'
import HudlLinkSelector from '@/components/shared/HudlLinkSelector'

interface HudlLink {
  link: string
  sport: string
}

interface ProfileSetupFormProps {
  userEmail: string
  userName: string
  userAvatar: string
}

export default function ProfileSetupForm({
  userEmail,
  userName,
  userAvatar,
}: ProfileSetupFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAgeRestrictionModal, setShowAgeRestrictionModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [role, setRole] = useState<'player' | 'scout'>('player')
  const [formData, setFormData] = useState({
    full_name: userName,
    birthday: '', // Date in YYYY-MM-DD format
    // Scout fields
    organization: '',
    price_per_eval: '99',
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
    sports: [],
  })

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

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const profileData: any = {
        user_id: session.user.id,
        role: role,
        full_name: formData.full_name || null,
        avatar_url: userAvatar || null,
        birthday: formData.birthday || null,
        bio: formData.bio || null,
        updated_at: new Date().toISOString(),
      }

      if (role === 'scout') {
        profileData.organization = formData.organization || null
        profileData.price_per_eval = formData.price_per_eval
          ? parseFloat(formData.price_per_eval)
          : 99
        profileData.social_link = formData.social_link || null
        profileData.turnaround_time = formData.turnaround_time || null
        profileData.sports = Array.isArray(formData.sports) ? formData.sports : []
      } else {
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
      }

      const { error: insertError } = await supabase
        .from('profiles')
        .insert(profileData)

      if (insertError) throw insertError

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

      router.push('/profile')
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
            I am a: *
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
          </div>
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

        {/* Scout-specific fields */}
        {role === 'scout' && (
          <>
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
              <label
                htmlFor="organization"
                className="block text-sm font-medium text-black mb-2"
              >
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
                placeholder="e.g., 24hr turnaround"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
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

