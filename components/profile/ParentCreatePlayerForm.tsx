'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import HudlLinkSelector from '@/components/shared/HudlLinkSelector'

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

const RESERVED_USERNAMES = new Set([
  'profile', 'profiles', 'browse', 'teams', 'team', 'api', 'terms-of-service',
  'privacy-policy', 'login', 'signup', 'my-evals', 'evaluations', 'stripe',
  'auth', 'admin', 'settings', 'money', 'marketing'
])

export default function ParentCreatePlayerForm({ parentProfile }: ParentCreatePlayerFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean
    available: boolean | null
    message: string | null
  }>({ checking: false, available: null, message: null })
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
  })

  const normalizeUsername = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-_]+|[-_]+$/g, '')
      .slice(0, 30)
  }

  // Real-time username availability checking
  useEffect(() => {
    const normalizedUsername = normalizeUsername(formData.username.trim())
    
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
        const { data: existingUsername, error } = await supabase
          .from('profiles')
          .select('id, user_id')
          .eq('username', normalizedUsername)
          .maybeSingle()
        
        if (error) {
          console.error('Error checking username:', error)
          setUsernameStatus({ 
            checking: false, 
            available: null, 
            message: 'Error checking username' 
          })
          return
        }

        // If username exists, it's taken
        if (existingUsername) {
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
  }, [formData.username, supabase])

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

      // Prepare hudl_links as JSONB array
      const hudlLinksArray = validHudlLinks.map((hl: HudlLink) => ({
        link: hl.link.trim(),
        sport: null, // sport no longer required
      }))

      // Use API endpoint to create player profile (bypasses RLS using admin client)
      const response = await fetch('/api/parent/create-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          username: normalizedUsername,
          social_link: formData.social_link.trim(),
          hudl_links: hudlLinksArray,
          hudl_link: hudlLinksArray.length > 0 ? hudlLinksArray[0].link : null, // Backward compatibility
          position: formData.position.trim(),
          school: formData.school.trim(),
          graduation_month: parseInt(formData.graduation_month),
          graduation_year: parseInt(formData.graduation_year),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create player profile')
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
          <div className="relative">
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) => {
                setFormData({ ...formData, username: normalizeUsername(e.target.value) })
                setError(null)
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                usernameStatus.available === true
                  ? 'border-green-500 focus:ring-green-500'
                  : usernameStatus.available === false
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-black'
              }`}
              required
              placeholder="username"
            />
            {usernameStatus.checking && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
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
          <p className="text-xs text-gray-500 mt-1">
            This will be the player's unique username on Got1.
          </p>
          {formData.username && (
            <p className="text-xs text-blue-600 mt-1">
              Preview: /{normalizeUsername(formData.username)}
            </p>
          )}
          {usernameStatus.message && (
            <p className={`text-xs mt-1 ${
              usernameStatus.available === true
                ? 'text-green-600'
                : usernameStatus.available === false
                ? 'text-red-600'
                : 'text-gray-600'
            }`}>
              {usernameStatus.message}
            </p>
          )}
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
          <HudlLinkSelector
            hudlLinks={formData.hudl_links}
            onChange={handleHudlLinksChange}
          />
          <p className="text-xs text-gray-500 mt-1">
            Add at least one link to the player's film (HUDL, QwikCut, or YouTube).
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
          <input
            type="text"
            id="school"
            value={formData.school}
            onChange={(e) => setFormData({ ...formData, school: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            required
            placeholder="High school name"
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

