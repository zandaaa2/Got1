'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

interface Step6SpecificInfoProps {
  profile: any
  playerProfile?: any
  accountType: 'player' | 'parent' | null
  onBack?: () => void
}

export default function Step6SpecificInfo({ profile, playerProfile, accountType, onBack }: Step6SpecificInfoProps) {
  // Use playerProfile if it exists (for parents), otherwise use profile (for players)
  const targetProfile = playerProfile || profile
  const [gpa, setGpa] = useState(targetProfile?.gpa?.toString() || '')
  const [weight, setWeight] = useState(targetProfile?.weight?.toString() || '')
  const [height, setHeight] = useState(targetProfile?.height || '')
  const [fortyYard, setFortyYard] = useState(targetProfile?.forty_yd_dash?.toString() || '')
  const [benchMax, setBenchMax] = useState(targetProfile?.bench_max?.toString() || '')
  const [squatMax, setSquatMax] = useState(targetProfile?.squat_max?.toString() || '')
  const [cleanMax, setCleanMax] = useState(targetProfile?.clean_max?.toString() || '')
  const [state, setState] = useState(targetProfile?.state || '')
  const [classification, setClassification] = useState(targetProfile?.classification || '')
  const [collegeOffers, setCollegeOffers] = useState(targetProfile?.college_offers || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (skip: boolean = false) => {
    setLoading(true)
    setError(null)

    try {
      const updateData: any = {}
      
      // Ensure role is set (always set it to be safe)
      if (accountType === 'player') {
        updateData.role = 'player'
      } else if (accountType === 'parent') {
        updateData.role = 'parent'
      } else if (targetProfile.role === 'player' || targetProfile.role === 'parent') {
        // Fallback: preserve existing role if accountType is null
        updateData.role = targetProfile.role
      }
      
      if (!skip) {
        if (gpa) updateData.gpa = parseFloat(gpa)
        if (weight) updateData.weight = parseFloat(weight)
        if (height) updateData.height = height.trim()
        if (fortyYard) updateData.forty_yd_dash = parseFloat(fortyYard)
        if (benchMax) updateData.bench_max = parseFloat(benchMax)
        if (squatMax) updateData.squat_max = parseFloat(squatMax)
        if (cleanMax) updateData.clean_max = parseFloat(cleanMax)
        if (state) updateData.state = state.trim()
        if (classification) updateData.classification = classification.trim()
        if (collegeOffers) updateData.college_offers = collegeOffers.trim()
      }

      // Log what we're about to update
      console.log('📝 Step 6 updating profile with:', {
        user_id: targetProfile.user_id,
        updateData: updateData,
        currentRole: targetProfile.role,
        accountType: accountType
      })

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', targetProfile.user_id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Step 6 update error:', updateError)
        throw updateError
      }
      
      console.log('✅ Step 6 data saved:', {
        profileId: updatedProfile?.id,
        userId: updatedProfile?.user_id,
        role: updatedProfile?.role,
        hudl_link: updatedProfile?.hudl_link,
        position: updatedProfile?.position,
        school: updatedProfile?.school,
        graduation_year: updatedProfile?.graduation_year,
        graduation_month: updatedProfile?.graduation_month,
        gpa: updatedProfile?.gpa,
        weight: updatedProfile?.weight,
        height: updatedProfile?.height,
        forty_yd_dash: updatedProfile?.forty_yd_dash,
        bench_max: updatedProfile?.bench_max,
        squat_max: updatedProfile?.squat_max,
        clean_max: updatedProfile?.clean_max,
        state: updatedProfile?.state,
        classification: updatedProfile?.classification,
        college_offers: updatedProfile?.college_offers
      })

      // For parents, verify the player profile exists and is linked
      if (accountType === 'parent' && playerProfile) {
        const { data: { session: verifySession } } = await supabase.auth.getSession()
        if (verifySession) {
          // Verify player profile exists
          const { data: verifyPlayerProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', playerProfile.user_id)
            .maybeSingle()
          
          console.log('🔍 Final verification - Player profile:', {
            playerId: playerProfile.user_id,
            profileExists: !!verifyPlayerProfile,
            profileData: verifyPlayerProfile
          })
          
          // Verify parent_children link
          const { data: verifyLink } = await supabase
            .from('parent_children')
            .select('*')
            .eq('parent_id', verifySession.user.id)
            .eq('player_id', playerProfile.user_id)
            .maybeSingle()
          
          console.log('🔍 Final verification - Parent-Child link:', {
            parentId: verifySession.user.id,
            playerId: playerProfile.user_id,
            linkExists: !!verifyLink,
            linkData: verifyLink
          })
          
          if (!verifyPlayerProfile) {
            console.error('❌ CRITICAL: Player profile does not exist after completion!')
          }
          if (!verifyLink) {
            console.error('❌ CRITICAL: Parent-Child link does not exist after completion!')
          }
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem(`onboarding_accountType_${targetProfile.user_id}`)
        sessionStorage.setItem(`onboarding_complete_${targetProfile.user_id}`, 'true')
        // Also set for player profile if it exists
        if (playerProfile) {
          sessionStorage.setItem(`onboarding_complete_${playerProfile.user_id}`, 'true')
        }
      }

      // Force a hard refresh to ensure profile data is reloaded
      window.location.href = `/profile?onboarding=complete&t=${Date.now()}`
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h3 className="text-lg font-bold text-black mb-2">Athletic Information (Optional)</h3>
        <p className="text-gray-600 text-sm mb-4">
          Add your athletic measurements and stats. You can skip this step and add this information later.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-black mb-2">GPA</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="5"
            value={gpa}
            onChange={(e) => setGpa(e.target.value)}
            placeholder="e.g., 3.5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Weight (lbs)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g., 185"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Height</label>
          <input
            type="text"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="e.g., 6'0&quot;"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">40 Yard Dash (seconds)</label>
          <input
            type="number"
            step="0.01"
            value={fortyYard}
            onChange={(e) => setFortyYard(e.target.value)}
            placeholder="e.g., 4.5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Bench Max (lbs)</label>
          <input
            type="number"
            value={benchMax}
            onChange={(e) => setBenchMax(e.target.value)}
            placeholder="e.g., 225"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Squat Max (lbs)</label>
          <input
            type="number"
            value={squatMax}
            onChange={(e) => setSquatMax(e.target.value)}
            placeholder="e.g., 315"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Clean Max (lbs)</label>
          <input
            type="number"
            value={cleanMax}
            onChange={(e) => setCleanMax(e.target.value)}
            placeholder="e.g., 275"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">State</label>
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="e.g., California"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Classification</label>
          <input
            type="text"
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            placeholder="e.g., Class of 2025"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-black mb-2">College Offers</label>
          <textarea
            value={collegeOffers}
            onChange={(e) => setCollegeOffers(e.target.value)}
            placeholder="List any college offers you've received"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      <div className="flex gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex-1 py-3 border border-gray-300 text-black rounded-lg font-medium hover:bg-gray-50"
          >
            Back
          </button>
        )}
        <button
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className={`${onBack ? 'flex-1' : 'w-full'} py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? 'Saving...' : 'Save & Complete'}
        </button>
      </div>
    </div>
  )
}



