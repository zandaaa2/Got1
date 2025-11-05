'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

interface ScoutApplicationFormProps {
  profile: any
}

export default function ScoutApplicationForm({ profile }: ScoutApplicationFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    current_workplace: '',
    current_position: '',
    work_history: '',
    additional_info: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Submit application
      const { error: submitError } = await fetch('/api/scout-application/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_workplace: formData.current_workplace,
          current_position: formData.current_position,
          work_history: formData.work_history,
          additional_info: formData.additional_info,
        }),
      }).then((res) => res.json())

      if (submitError) throw new Error(submitError)

      // Redirect to profile page
      router.push('/profile')
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
      <h1 className="text-3xl font-bold text-black mb-6">Scout Application</h1>

      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-black text-sm">
          Please provide information about your current role and work history. This will help us
          verify your eligibility to become a scout on Got1.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="current_workplace"
            className="block text-sm font-medium text-black mb-2"
          >
            Current Workplace *
          </label>
          <input
            type="text"
            id="current_workplace"
            name="current_workplace"
            value={formData.current_workplace}
            onChange={handleChange}
            required
            placeholder="e.g., Auburn University, SMU, Dallas Cowboys"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label
            htmlFor="current_position"
            className="block text-sm font-medium text-black mb-2"
          >
            Current Position *
          </label>
          <input
            type="text"
            id="current_position"
            name="current_position"
            value={formData.current_position}
            onChange={handleChange}
            required
            placeholder="e.g., Player Personnel Assistant, Director of Recruiting"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label
            htmlFor="work_history"
            className="block text-sm font-medium text-black mb-2"
          >
            Work History *
          </label>
          <textarea
            id="work_history"
            name="work_history"
            value={formData.work_history}
            onChange={handleChange}
            required
            rows={6}
            placeholder="Please provide a brief overview of your work history in player personnel, recruiting, or related roles..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Application'}
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
    </div>
  )
}

