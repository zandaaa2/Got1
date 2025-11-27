'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import HudlLinkSelector from '@/components/shared/HudlLinkSelector'
import CollegeSelector from '@/components/profile/CollegeSelector'

interface HudlLink {
  link: string
  sport: string
}

const MONTHS = [
  { value: '', label: 'Select Month' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

interface PlayerSetupFormProps {
  profile: any
}

export default function PlayerSetupForm({ profile }: PlayerSetupFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    social_link: profile?.social_link || '',
    hudl_links: profile?.hudl_links || [{ link: '', sport: '' }],
    position: profile?.position || '',
    school: profile?.school || '',
    graduation_month: profile?.graduation_month || '',
    graduation_year: profile?.graduation_year || '',
    parent_name: profile?.parent_name || '',
    bio: profile?.bio || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.social_link || formData.social_link.trim() === '') {
        setError('Social media link is required.')
        setLoading(false)
        return
      }

      // Validate film link
      const validHudlLinks = formData.hudl_links.filter(
        (hl: HudlLink) => hl.link && hl.link.trim() !== ''
      )

      if (validHudlLinks.length === 0) {
        setError('At least one film link (HUDL, QwikCut, or YouTube) is required.')
        setLoading(false)
        return
      }

      // Validate sport for each link
      for (const link of validHudlLinks) {
        const validSports = ['football', 'mens-basketball']
        if (!link.sport || !validSports.includes(link.sport)) {
          setError('Please select a sport (football or men\'s basketball) for each film link.')
          setLoading(false)
          return
        }
      }

      if (!formData.position || formData.position.trim() === '') {
        setError('Position is required.')
        setLoading(false)
        return
      }

      if (!formData.school || formData.school.trim() === '') {
        setError('School is required.')
        setLoading(false)
        return
      }

      if (!formData.graduation_month) {
        setError('Graduation month is required.')
        setLoading(false)
        return
      }

      if (!formData.graduation_year) {
        setError('Graduation year is required.')
        setLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Get user metadata from auth.users as fallback
      let authName = null
      let authAvatar = null
      try {
        const { data: { user } } = await supabase.auth.getUser()
        authName = user?.user_metadata?.full_name || user?.user_metadata?.name || null
        authAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
      } catch (err) {
        // If getUser fails, continue without auth metadata
        console.warn('Could not fetch user metadata:', err)
      }

      // Prepare hudl_links as JSONB array
      const hudlLinksArray = validHudlLinks.map((hl: HudlLink) => ({
        link: hl.link.trim(),
        sport: hl.sport,
      }))

      // Update profile to player role
      // IMPORTANT: Preserve existing fields, or pull from auth.users if missing
      const updateData: any = {
        role: 'player',
        social_link: formData.social_link.trim(),
        hudl_links: hudlLinksArray,
        hudl_link: hudlLinksArray.length > 0 ? hudlLinksArray[0].link : null, // Backward compatibility
        sport: hudlLinksArray.length > 0 ? hudlLinksArray[0].sport : null,
        position: formData.position.trim(),
        school: formData.school.trim(),
        graduation_month: parseInt(formData.graduation_month),
        graduation_year: parseInt(formData.graduation_year),
        parent_name: formData.parent_name?.trim() || null,
        bio: formData.bio?.trim() || null,
        // Preserve existing fields from profile, or pull from auth.users if missing
        full_name: profile?.full_name || authName || null,
        username: profile?.username || null,
        avatar_url: profile?.avatar_url || authAvatar || null,
        birthday: profile?.birthday || null,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', session.user.id)

      if (updateError) throw updateError

      // Redirect to profile
      router.push('/profile')
      router.refresh()
    } catch (error: any) {
      console.error('Error updating player profile:', error)
      setError(error.message || 'Failed to update profile. Please try again.')
      setLoading(false)
    }
  }

  const handleHudlLinksChange = (links: HudlLink[]) => {
    setFormData({ ...formData, hudl_links: links })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">Complete Your Player Profile</h1>
      <p className="text-gray-600 mb-8">
        Add your player information to get started with evaluations from college scouts.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Social Media Link */}
        <div>
          <label htmlFor="social_link" className="block text-sm font-medium text-black mb-2">
            Social Media Link <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            id="social_link"
            value={formData.social_link}
            onChange={(e) => setFormData({ ...formData, social_link: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            required
            placeholder="https://twitter.com/yourhandle or https://instagram.com/yourhandle"
          />
          <p className="text-xs text-gray-500 mt-1">
            Link to your Twitter, Instagram, or other social media profile.
          </p>
        </div>

        {/* Film Links */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Film Link <span className="text-red-500">*</span>
          </label>
          <HudlLinkSelector
            hudlLinks={formData.hudl_links}
            onChange={handleHudlLinksChange}
          />
          <p className="text-xs text-gray-500 mt-1">
            Add at least one link to your film (HUDL, QwikCut, or YouTube). Select the sport for each link.
          </p>
        </div>

        {/* Position */}
        <div>
          <label htmlFor="position" className="block text-sm font-medium text-black mb-2">
            Position <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="position"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            required
            placeholder="e.g., Quarterback, Point Guard"
          />
        </div>

        {/* School */}
        <div>
          <label htmlFor="school" className="block text-sm font-medium text-black mb-2">
            School <span className="text-red-500">*</span>
          </label>
          <CollegeSelector
            value={formData.school}
            onChange={(value) => setFormData({ ...formData, school: value })}
            placeholder="Search for your school"
          />
        </div>

        {/* Graduation Month and Year */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="graduation_month" className="block text-sm font-medium text-black mb-2">
              Graduation Month <span className="text-red-500">*</span>
            </label>
            <select
              id="graduation_month"
              value={formData.graduation_month}
              onChange={(e) => setFormData({ ...formData, graduation_month: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              required
            >
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="graduation_year" className="block text-sm font-medium text-black mb-2">
              Graduation Year <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="graduation_year"
              value={formData.graduation_year}
              onChange={(e) => setFormData({ ...formData, graduation_year: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              required
              min={new Date().getFullYear()}
              max={new Date().getFullYear() + 10}
              placeholder="2025"
            />
          </div>
        </div>

        {/* Parent Name */}
        <div>
          <label htmlFor="parent_name" className="block text-sm font-medium text-black mb-2">
            Parent Name (if account is run by parent)
          </label>
          <input
            type="text"
            id="parent_name"
            value={formData.parent_name}
            onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="Parent or guardian name"
          />
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-black mb-2">
            Bio
          </label>
          <textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            rows={4}
            placeholder="Tell scouts about yourself..."
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : 'Complete Player Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}

