'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'

interface Step4HudlLinkProps {
  profile: any
  playerProfile?: any
  onComplete: () => void
  onBack: () => void
}

export default function Step4HudlLink({ profile, playerProfile, onComplete, onBack }: Step4HudlLinkProps) {
  // Use playerProfile if it exists (for parents), otherwise use profile (for players)
  const targetProfile = playerProfile || profile
  const [hudlLink, setHudlLink] = useState(targetProfile?.hudl_link || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!hudlLink.trim()) {
      setError('HUDL link is required')
      return
    }

    if (!hudlLink.includes('hudl.com') && !hudlLink.startsWith('http')) {
      setError('Please enter a valid HUDL link')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ hudl_link: hudlLink.trim() })
        .eq('user_id', targetProfile.user_id)
        .select()
        .single()

      if (updateError) throw updateError
      
      console.log('✅ Step 4 data saved:', {
        role: updatedProfile?.role,
        hudl_link: updatedProfile?.hudl_link
      })

      onComplete()
    } catch (err: any) {
      setError(err.message || 'Failed to save HUDL link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h3 className="text-lg font-bold text-black mb-2">Game Film Link (Required)</h3>
        <p className="text-gray-600 text-sm mb-4">
          Add your HUDL profile link so scouts can view your game film. This is required to receive evaluations.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-black mb-2">
          HUDL Link <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={hudlLink}
          onChange={(e) => setHudlLink(e.target.value)}
          placeholder="https://www.hudl.com/profile/..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter your full HUDL profile URL
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-gray-300 text-black rounded-lg font-medium hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={!hudlLink.trim() || loading}
          className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}



