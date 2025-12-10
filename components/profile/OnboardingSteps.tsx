'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Image from 'next/image'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'

interface OnboardingStepsProps {
  profile: any
}

type Step = 1 | 2 | 3 | 4

export default function OnboardingSteps({ profile }: OnboardingStepsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasInitialized = useRef(false)
  
  // Step 1: Account type
  const [accountType, setAccountType] = useState<'player' | 'parent' | null>(null)
  
  // Step 2: HUDL link (required for both)
  const [hudlLink, setHudlLink] = useState(profile.hudl_link || '')
  
  // Step 3: Additional details
  const [socialLink, setSocialLink] = useState(profile.social_link || '')
  const [position, setPosition] = useState(profile.position || '')
  const [school, setSchool] = useState(profile.school || '')
  const [graduationMonth, setGraduationMonth] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  
  // Step 3 for Parent: Child info
  const [playerName, setPlayerName] = useState('')
  const [playerAvatarFile, setPlayerAvatarFile] = useState<File | null>(null)
  const [playerAvatarPreview, setPlayerAvatarPreview] = useState<string | null>(null)
  
  // Step 4: Athletic info (skippable)
  const [gpa, setGpa] = useState(profile.gpa?.toString() || '')
  const [weight, setWeight] = useState(profile.weight?.toString() || '')
  const [height, setHeight] = useState(profile.height || '')
  const [fortyYard, setFortyYard] = useState(profile.forty_yd_dash?.toString() || '')
  const [benchMax, setBenchMax] = useState(profile.bench_max?.toString() || '')
  const [squatMax, setSquatMax] = useState(profile.squat_max?.toString() || '')
  const [cleanMax, setCleanMax] = useState(profile.clean_max?.toString() || '')
  const [state, setState] = useState(profile.state || '')
  const [classification, setClassification] = useState(profile.classification || '')
  const [collegeOffers, setCollegeOffers] = useState(profile.college_offers || '')

  // Detect current step based on profile data - only on initial mount
  useEffect(() => {
    // Only run step detection once on mount to prevent resetting step when typing
    if (hasInitialized.current) {
      return
    }
    
    // If profile already has a role other than 'user', skip onboarding
    if (profile.role && profile.role !== 'user') {
      hasInitialized.current = true
      return
    }
    
    // Determine current step based on what's completed in the profile (not local state)
    if (!profile.role || profile.role === 'user') {
      setCurrentStep(1)
    } else if (!profile.hudl_link) {
      setCurrentStep(2)
    } else {
      // Check what's missing for step 3 - use profile fields only, not local state
      const hasBasicInfo = profile.social_link || profile.position || profile.school || profile.graduation_year
      if (!hasBasicInfo) {
        setCurrentStep(3)
      } else {
        setCurrentStep(4)
      }
    }
    
    hasInitialized.current = true
  }, [profile.role, profile.hudl_link, profile.social_link, profile.position, profile.school, profile.graduation_year])

  // Initialize from profile
  useEffect(() => {
    if (profile.role && profile.role !== 'user') {
      setAccountType(profile.role as 'player' | 'parent')
    }
    
    // Initialize form fields from existing profile data
    if (profile.hudl_link) setHudlLink(profile.hudl_link)
    if (profile.social_link) setSocialLink(profile.social_link)
    if (profile.position) setPosition(profile.position)
    if (profile.school) setSchool(profile.school)
    if (profile.graduation_month) {
      setGraduationMonth(String(profile.graduation_month).padStart(2, '0'))
    }
    if (profile.graduation_year) {
      setGraduationYear(String(profile.graduation_year))
    }
  }, [profile])

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPlayerAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPlayerAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleStep1Submit = async () => {
    if (!accountType) {
      setError('Please select an account type')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Update profile role
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: accountType })
        .eq('user_id', profile.user_id)

      if (updateError) throw updateError

      setCurrentStep(2)
    } catch (err: any) {
      setError(err.message || 'Failed to update account type')
    } finally {
      setLoading(false)
    }
  }

  const handleStep2Submit = async () => {
    if (!hudlLink.trim()) {
      setError('HUDL link is required')
      return
    }

    // Basic URL validation
    if (!hudlLink.includes('hudl.com') && !hudlLink.startsWith('http')) {
      setError('Please enter a valid HUDL link')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ hudl_link: hudlLink.trim() })
        .eq('user_id', profile.user_id)

      if (updateError) throw updateError

      setCurrentStep(3)
    } catch (err: any) {
      setError(err.message || 'Failed to save HUDL link')
    } finally {
      setLoading(false)
    }
  }

  const handleStep3Submit = async () => {
    if (accountType === 'parent') {
      if (!playerName.trim()) {
        setError('Player name is required')
        return
      }
    }

    if (!position.trim()) {
      setError('Position is required')
      return
    }

    if (!school.trim()) {
      setError('School is required')
      return
    }

    if (!graduationYear || !graduationMonth) {
      setError('Graduation date is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let updateData: any = {
        social_link: socialLink.trim() || null,
        position: position.trim(),
        school: school.trim(),
        graduation_year: parseInt(graduationYear),
        graduation_month: parseInt(graduationMonth),
      }

      // Upload player avatar for parent accounts
      if (accountType === 'parent' && playerAvatarFile) {
        const fileExt = playerAvatarFile.name.split('.').pop()
        const fileName = `${profile.user_id}-${Date.now()}.${fileExt}`
        const filePath = `player-avatars/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, playerAvatarFile)

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)
          
          updateData.player_avatar_url = publicUrl
        }
      }

      // For parent: store child info in profile fields (we'll handle parent-child relationship separately)
      if (accountType === 'parent') {
        updateData.parent_name = profile.full_name
        // Store child name temporarily - will be used when creating child profile
        updateData.child_name = playerName.trim()
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', profile.user_id)

      if (updateError) throw updateError

      setCurrentStep(4)
    } catch (err: any) {
      setError(err.message || 'Failed to save additional details')
    } finally {
      setLoading(false)
    }
  }

  const handleStep4Submit = async (skip: boolean = false) => {
    if (skip) {
      router.refresh()
      return
    }

    setLoading(true)
    setError(null)

    try {
      const updateData: any = {}
      
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

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', profile.user_id)

      if (updateError) throw updateError

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save athletic info')
      setLoading(false)
    }
  }

  const getStepProgress = () => {
    return {
      step1: accountType ? 100 : 0,
      step2: hudlLink ? 100 : 0,
      step3: (socialLink || position || school || graduationYear) ? 50 : 0,
      step4: 0,
    }
  }

  const progress = getStepProgress()

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8 mb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black mb-2">Complete Your Profile</h2>
        <p className="text-gray-600 text-sm">
          Follow these steps to set up your account and start using Got1
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex-1 flex items-center ${step < 4 ? 'mr-2' : ''}`}
            >
              <div className="flex-1 flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    currentStep >= step
                      ? 'bg-black text-white'
                      : progress[`step${step}` as keyof typeof progress] > 0
                      ? 'bg-gray-400 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {progress[`step${step}` as keyof typeof progress] === 100 ? '✓' : step}
                </div>
                {step < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      currentStep > step
                        ? 'bg-black'
                        : progress[`step${step}` as keyof typeof progress] > 0
                        ? 'bg-gray-400'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Account Type</span>
          <span>Film Link</span>
          <span>Details</span>
          <span>Athletic Info</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Account Type */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-black mb-2">Step 1: Select Account Type</h3>
            <p className="text-gray-600 text-sm mb-4">
              Choose whether this account is for a player or a parent managing their child's profile.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setAccountType('player')}
              className={`p-6 rounded-lg border-2 text-left transition-all ${
                accountType === 'player'
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-bold text-black mb-2">Player</div>
              <div className="text-sm text-gray-600">
                This account is for a high school football player who will receive evaluations.
              </div>
            </button>

            <button
              onClick={() => setAccountType('parent')}
              className={`p-6 rounded-lg border-2 text-left transition-all ${
                accountType === 'parent'
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-bold text-black mb-2">Parent</div>
              <div className="text-sm text-gray-600">
                This account is for a parent managing their child's football profile and evaluations.
              </div>
            </button>
          </div>

          <button
            onClick={handleStep1Submit}
            disabled={!accountType || loading}
            className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      )}

      {/* Step 2: HUDL Link */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-black mb-2">Step 2: Game Film Link (Required)</h3>
            <p className="text-gray-600 text-sm mb-4">
              Add your HUDL profile link so scouts can view your game film. This is required to receive evaluations.
            </p>
          </div>

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
              onClick={() => setCurrentStep(1)}
              className="flex-1 py-3 border border-gray-300 text-black rounded-lg font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleStep2Submit}
              disabled={!hudlLink.trim() || loading}
              className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Additional Details */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-black mb-2">Step 3: Additional Details</h3>
            <p className="text-gray-600 text-sm mb-4">
              {accountType === 'player'
                ? 'Add more information about yourself to help scouts find you.'
                : 'Add information about your child to help scouts find them.'}
            </p>
          </div>

          {accountType === 'parent' && (
            <>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Player Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter player's full name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Player Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  {playerAvatarPreview && (
                    <img
                      src={playerAvatarPreview}
                      alt="Player avatar preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Social Media Link
            </label>
            <input
              type="url"
              value={socialLink}
              onChange={(e) => setSocialLink(e.target.value)}
              placeholder="Instagram, Twitter, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Position <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g., Quarterback, Wide Receiver"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              School <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="High school name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Graduation Date <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={graduationMonth}
                onChange={(e) => setGraduationMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                required
              >
                <option value="">Month</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={String(month).padStart(2, '0')}>
                    {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="Year"
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 5}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex-1 py-3 border border-gray-300 text-black rounded-lg font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleStep3Submit}
              disabled={loading}
              className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Athletic Info (Skippable) */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-black mb-2">Step 4: Athletic Information (Optional)</h3>
            <p className="text-gray-600 text-sm mb-4">
              Add your athletic measurements and stats. You can skip this step and add this information later.
            </p>
          </div>

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
            <button
              onClick={() => setCurrentStep(3)}
              className="flex-1 py-3 border border-gray-300 text-black rounded-lg font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => handleStep4Submit(true)}
              className="flex-1 py-3 border border-gray-300 text-black rounded-lg font-medium hover:bg-gray-50"
            >
              Skip for Now
            </button>
            <button
              onClick={() => handleStep4Submit(false)}
              disabled={loading}
              className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save & Complete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


