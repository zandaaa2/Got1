'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { MultiSportSelector } from '@/components/shared/SportSelector'

interface ScoutSetupFormProps {
  profile: any
}

export default function ScoutSetupForm({ profile }: ScoutSetupFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    organization: profile?.organization || '',
    sports: profile?.sports || [],
    position: profile?.position || '',
    work_history: '',
    additional_info: '',
    social_link: profile?.social_link || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.organization || formData.organization.trim() === '') {
        setError('Organization is required.')
        setLoading(false)
        return
      }

      if (!formData.sports || formData.sports.length === 0) {
        setError('Please select at least one sport you evaluate (football or men\'s basketball).')
        setLoading(false)
        return
      }

      // Validate sports are only football or men's basketball
      const validSports = formData.sports.filter((sport: string) => 
        sport === 'football' || sport === 'mens-basketball'
      )
      if (validSports.length === 0) {
        setError('Please select football or men\'s basketball as the sport you evaluate.')
        setLoading(false)
        return
      }

      if (!formData.position || formData.position.trim() === '') {
        setError('Position is required.')
        setLoading(false)
        return
      }

      if (!formData.social_link || formData.social_link.trim() === '') {
        setError('Social media link is required.')
        setLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Update profile to scout role
      const updateData: any = {
        role: 'scout',
        organization: formData.organization.trim(),
        sports: validSports,
        position: formData.position.trim(),
        social_link: formData.social_link.trim(),
        work_history: formData.work_history?.trim() || null,
        additional_info: formData.additional_info?.trim() || null,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', session.user.id)

      if (updateError) throw updateError

      // If work_history or additional_info is provided, also create a scout application
      // This allows admins to review scouts who provide additional info
      if (formData.work_history.trim() || formData.additional_info.trim()) {
        try {
          await fetch('/api/scout-application/submit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              current_workplace: formData.organization.trim(),
              current_position: formData.position.trim(),
              work_history: formData.work_history.trim() || 'N/A',
              additional_info: formData.additional_info.trim() || null,
            }),
          })
        } catch (appError) {
          // Don't fail the profile update if application submission fails
          console.error('Error submitting scout application:', appError)
        }
      }

      // Redirect to profile
      router.push('/profile')
      router.refresh()
    } catch (error: any) {
      console.error('Error updating scout profile:', error)
      setError(error.message || 'Failed to update profile. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">Complete Your Scout Profile</h1>
      <p className="text-gray-600 mb-8">
        Add your scout information to start evaluating player film and connecting with athletes.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Organization */}
        <div>
          <label htmlFor="organization" className="block text-sm font-medium text-black mb-2">
            Organization <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="organization"
            value={formData.organization}
            onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            required
            placeholder="e.g., Auburn University, SMU, Dallas Cowboys"
          />
          <p className="text-xs text-gray-500 mt-1">
            The college, university, or organization you're associated with.
          </p>
        </div>

        {/* Sport You Evaluate */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Sport You Evaluate <span className="text-red-500">*</span>
          </label>
          <MultiSportSelector
            selectedSports={formData.sports}
            onToggle={(sport) => {
              const currentSports = formData.sports || []
              const newSports = currentSports.includes(sport)
                ? currentSports.filter(s => s !== sport)
                : [...currentSports, sport]
              setFormData({ ...formData, sports: newSports })
            }}
            label=""
            availableSports={['football', 'basketball']}
          />
          <p className="text-xs text-gray-500 mt-1">
            Select the sport(s) you evaluate. Currently, we support football and men's basketball.
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
            placeholder="e.g., Recruiting Coordinator, Defensive Coordinator"
          />
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
            Link to your Twitter, Instagram, or other social media profile.
          </p>
        </div>

        {/* Work History */}
        <div>
          <label htmlFor="work_history" className="block text-sm font-medium text-black mb-2">
            Work History
          </label>
          <textarea
            id="work_history"
            value={formData.work_history}
            onChange={(e) => setFormData({ ...formData, work_history: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            rows={4}
            placeholder="Tell us about your experience as a scout, coach, or in college athletics..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional: Share your background and experience. This helps us verify your eligibility.
          </p>
        </div>

        {/* Additional Info */}
        <div>
          <label htmlFor="additional_info" className="block text-sm font-medium text-black mb-2">
            Additional Information
          </label>
          <textarea
            id="additional_info"
            value={formData.additional_info}
            onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            rows={4}
            placeholder="Any additional information you'd like to share..."
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : 'Complete Scout Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}

