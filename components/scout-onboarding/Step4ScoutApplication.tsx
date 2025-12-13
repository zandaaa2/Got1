'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'

// Vivid blue color constant
const VIVID_BLUE = '#233dff'

interface Step4ScoutApplicationProps {
  session: Session
  profile: any
  onBack: () => void
}

export default function Step4ScoutApplication({ session, profile, onBack }: Step4ScoutApplicationProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    current_workplace: '',
    current_position: '',
    work_history: '',
    social_link: '',
    additional_info: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Submit application
      const response = await fetch('/api/scout-application/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_workplace: formData.current_workplace,
          current_position: formData.current_position,
          work_history: formData.work_history,
          social_link: formData.social_link,
          additional_info: formData.additional_info,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application')
      }

      // Redirect to profile page with success message
      router.push('/profile?application=submitted')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to submit application')
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
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-black mb-2">Scout Application</h2>
        <p className="text-gray-600">
          Please provide information about your current role and work history. This will help us verify your eligibility to become a scout on Got1.
        </p>
      </div>

      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-black text-sm">
          Your application will be reviewed by our team. You'll be notified once a decision has been made.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="current_workplace"
            className="block text-sm font-medium text-black mb-2"
          >
            Current Workplace <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="current_workplace"
            name="current_workplace"
            value={formData.current_workplace}
            onChange={handleChange}
            required
            placeholder="e.g., Auburn University, SMU, Dallas Cowboys"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': VIVID_BLUE } as React.CSSProperties}
          />
        </div>

        <div>
          <label
            htmlFor="current_position"
            className="block text-sm font-medium text-black mb-2"
          >
            Current Position <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="current_position"
            name="current_position"
            value={formData.current_position}
            onChange={handleChange}
            required
            placeholder="e.g., Player Personnel Assistant, Director of Recruiting"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': VIVID_BLUE } as React.CSSProperties}
          />
        </div>

        <div>
          <label
            htmlFor="work_history"
            className="block text-sm font-medium text-black mb-2"
          >
            Work History <span className="text-red-500">*</span>
          </label>
          <textarea
            id="work_history"
            name="work_history"
            value={formData.work_history}
            onChange={handleChange}
            required
            rows={6}
            placeholder="Please provide a brief overview of your work history in player personnel, recruiting, or related roles..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': VIVID_BLUE } as React.CSSProperties}
          />
        </div>

        <div>
          <label
            htmlFor="social_link"
            className="block text-sm font-medium text-black mb-2"
          >
            Social Media Link
          </label>
          <input
            type="url"
            id="social_link"
            name="social_link"
            value={formData.social_link}
            onChange={handleChange}
            placeholder="https://x.com/yourhandle or https://instagram.com/yourhandle"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': VIVID_BLUE } as React.CSSProperties}
          />
        </div>

        <div>
          <label
            htmlFor="additional_info"
            className="block text-sm font-medium text-black mb-2"
          >
            Additional Information
          </label>
          <textarea
            id="additional_info"
            name="additional_info"
            value={formData.additional_info}
            onChange={handleChange}
            rows={4}
            placeholder="Any additional information you'd like to share..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': VIVID_BLUE } as React.CSSProperties}
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity font-medium"
            style={{ backgroundColor: VIVID_BLUE }}
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  )
}

