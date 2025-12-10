'use client'

import { useState } from 'react'
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

interface ParentCreatePlayerFormProps {
  parentProfile: any
}

export default function ParentCreatePlayerForm({ parentProfile }: ParentCreatePlayerFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    social_link: '',
    hudl_links: [{ link: '', sport: '' }],
    position: '',
    school: '',
    graduation_month: '',
    graduation_year: '',
    bio: '',
  })

  const normalizeUsername = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-_]+|[-_]+$/g, '')
      .slice(0, 30)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.full_name || formData.full_name.trim() === '') {
        setError('Player name is required.')
        setLoading(false)
        return
      }

      if (!formData.username || formData.username.trim() === '') {
        setError('Username is required.')
        setLoading(false)
        return
      }

      const normalizedUsername = normalizeUsername(formData.username)
      if (normalizedUsername.length < 3) {
        setError('Username must be at least 3 characters.')
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

      // Generate a placeholder UUID for the player profile
      // This will be updated when the player claims their account
      // Use crypto.randomUUID() if available, otherwise generate a UUID v4
      const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          return crypto.randomUUID()
        }
        // Fallback: Generate UUID v4 format
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0
          const v = c === 'x' ? r : (r & 0x3 | 0x8)
          return v.toString(16)
        })
      }
      const placeholderUserId = generateUUID()

      // Prepare hudl_links as JSONB array
      const hudlLinksArray = validHudlLinks.map((hl: HudlLink) => ({
        link: hl.link.trim(),
        sport: hl.sport,
      }))

      // Create new player profile with placeholder user_id
      const playerProfileData: any = {
        user_id: placeholderUserId, // Placeholder - will be updated when player claims account
        role: 'player',
        full_name: formData.full_name.trim(),
        username: normalizedUsername,
        social_link: formData.social_link.trim(),
        hudl_links: hudlLinksArray,
        hudl_link: hudlLinksArray.length > 0 ? hudlLinksArray[0].link : null, // Backward compatibility
        sport: hudlLinksArray.length > 0 ? hudlLinksArray[0].sport : null,
        position: formData.position.trim(),
        school: formData.school.trim(),
        graduation_month: parseInt(formData.graduation_month),
        graduation_year: parseInt(formData.graduation_year),
        bio: formData.bio?.trim() || null,
        created_by_parent: true, // Mark that parent created this profile
      }

      const { data: playerProfile, error: createError } = await supabase
        .from('profiles')
        .insert(playerProfileData)
        .select()
        .single()

      if (createError) throw createError

      // Create parent_children relationship
      const { error: linkError } = await supabase
        .from('parent_children')
        .insert({
          parent_id: session.user.id,
          player_id: placeholderUserId,
        })

      if (linkError) {
        // If linking fails, try to delete the player profile we just created
        await supabase.from('profiles').delete().eq('id', playerProfile.id)
        throw linkError
      }

      // Redirect to parent profile
      router.push('/profile')
      router.refresh()
    } catch (error: any) {
      console.error('Error creating player profile:', error)
      setError(error.message || 'Failed to create player profile. Please try again.')
      setLoading(false)
    }
  }

  const handleHudlLinksChange = (links: HudlLink[]) => {
    setFormData({ ...formData, hudl_links: links })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">Create Player Page</h1>
      <p className="text-gray-600 mb-8">
        Fill in your child's player information. You can edit this later from your parent dashboard.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Player Name */}
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-black mb-2">
            Player Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="full_name"
            value={formData.full_name}
            onChange={(e) => {
              setFormData({ ...formData, full_name: e.target.value })
              // Auto-generate username from name
              if (!formData.username) {
                setFormData(prev => ({ ...prev, username: normalizeUsername(e.target.value) }))
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            required
            placeholder="Player's full name"
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
            onChange={(e) => setFormData({ ...formData, username: normalizeUsername(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            required
            placeholder="username"
          />
          <p className="text-xs text-gray-500 mt-1">
            This will be the player's unique username on Got1.
          </p>
        </div>

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
            Link to the player's Twitter, Instagram, or other social media profile.
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
            Add at least one link to the player's film (HUDL, QwikCut, or YouTube). Select the sport for each link.
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
            placeholder="Search for school"
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
            placeholder="Tell scouts about the player..."
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Player Page'}
          </button>
        </div>
      </form>
    </div>
  )
}

