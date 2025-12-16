'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

const normalizeUsername = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 30)
}

const RESERVED_USERNAMES = new Set([
  'profile', 'profiles', 'browse', 'teams', 'team', 'api', 'terms-of-service',
  'privacy-policy', 'login', 'signup', 'my-evals', 'evaluations', 'stripe',
  'auth', 'admin', 'settings', 'money', 'marketing'
])

interface Step5GeneralInfoProps {
  profile: any
  playerProfile?: any
  accountType: 'player' | 'parent' | null
  onComplete: () => void
  onBack: () => void
}

export default function Step5GeneralInfo({ profile, playerProfile, accountType, onComplete, onBack }: Step5GeneralInfoProps) {
  // Use playerProfile if it exists (for parents), otherwise use profile (for players)
  const targetProfile = playerProfile || profile
  const [socialLink, setSocialLink] = useState(targetProfile?.social_link || '')
  const [position, setPosition] = useState(targetProfile?.position || '')
  const [school, setSchool] = useState(targetProfile?.school || '')
  const [graduationMonth, setGraduationMonth] = useState(targetProfile?.graduation_month ? String(targetProfile.graduation_month).padStart(2, '0') : '')
  const [graduationYear, setGraduationYear] = useState(targetProfile?.graduation_year ? String(targetProfile.graduation_year) : '')
  const [playerName, setPlayerName] = useState(targetProfile?.full_name || '')
  const [playerUsername, setPlayerUsername] = useState(() => {
    // Only set initial username if it's not a temporary one
    if (targetProfile?.username && !targetProfile.username.startsWith('player-')) {
      return targetProfile.username
    }
    return ''
  })
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean
    available: boolean | null
    message: string | null
  }>({ checking: false, available: null, message: null })
  const [playerAvatarFile, setPlayerAvatarFile] = useState<File | null>(null)
  const [playerAvatarPreview, setPlayerAvatarPreview] = useState<string | null>(targetProfile?.avatar_url || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (targetProfile?.graduation_month) {
      setGraduationMonth(String(targetProfile.graduation_month).padStart(2, '0'))
    }
    if (targetProfile?.graduation_year) {
      setGraduationYear(String(targetProfile.graduation_year))
    }
    if (accountType === 'parent') {
      // Set player name from existing profile or keep empty for new players
      if (targetProfile?.full_name) {
        setPlayerName(targetProfile.full_name)
      } else {
        setPlayerName('')
      }
      // Set username only if it's not a temporary one
      if (targetProfile?.username && !targetProfile.username.startsWith('player-')) {
        setPlayerUsername(targetProfile.username)
      } else {
        setPlayerUsername('')
      }
      if (targetProfile?.avatar_url) {
        setPlayerAvatarPreview(targetProfile.avatar_url)
      }
    }
  }, [targetProfile, accountType])

  // Real-time username availability checking (only for parents creating new players)
  useEffect(() => {
    if (accountType !== 'parent' || !playerProfile) {
      return
    }

    const normalizedUsername = normalizeUsername(playerUsername.trim())
    
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

        // If username exists and belongs to a different user, it's taken
        if (existingUsername && existingUsername.user_id !== playerProfile.user_id) {
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
  }, [playerUsername, accountType, playerProfile, supabase])

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

  const handleSubmit = async () => {
    // For parents, create player profile if it doesn't exist
    if (accountType === 'parent' && !playerProfile) {
      // Need to create player profile first
      if (!playerName.trim()) {
        setError('Player name is required')
        return
      }
      
      if (!playerUsername.trim()) {
        setError('Username is required for the player profile')
        return
      }
      
      const normalizedUsername = normalizeUsername(playerUsername.trim())
      if (normalizedUsername.length < 3) {
        setError('Username must be at least 3 characters long')
        return
      }
      
      if (RESERVED_USERNAMES.has(normalizedUsername)) {
        setError('This username is reserved. Please choose another.')
        return
      }
      
      // Check if username is already taken
      const { data: existingUsername } = await supabase
        .from('profiles')
        .select('id, user_id')
        .eq('username', normalizedUsername)
        .maybeSingle()
      
      if (existingUsername) {
        setError('This username is already taken. Please choose another.')
        return
      }
      
      // Create player profile via API
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch('/api/parent/create-player', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            full_name: playerName.trim(),
            username: normalizedUsername,
            position: position.trim(),
            school: school.trim(),
            graduation_month: graduationMonth,
            graduation_year: parseInt(graduationYear),
            social_link: socialLink.trim() || null,
          }),
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create player profile')
        }
        
        // Player profile created, continue with the rest of the form submission
        // The playerProfile will be set by the parent component on next render
        // For now, we'll just proceed - the parent component should refresh and get the new profile
        console.log('✅ Player profile created:', data.playerProfile)
        
        // Reload the page to get the updated playerProfile
        window.location.reload()
        return
      } catch (err: any) {
        setError(err.message || 'Failed to create player profile')
        setLoading(false)
        return
      }
    }
    
    // For parents creating a new player, player name is required
    if (accountType === 'parent' && (!playerProfile?.full_name || playerProfile?.full_name.trim() === '') && !playerName.trim()) {
      setError('Player name is required')
      return
    }

    // For parents creating a new player, username is required
    if (accountType === 'parent' && playerProfile) {
      const currentUsername = playerProfile.username || ''
      const isTemporaryUsername = currentUsername.startsWith('player-') && currentUsername.includes('-')
      
      if (isTemporaryUsername && !playerUsername.trim()) {
        setError('Username is required for the player profile')
        return
      }
      
      // Validate username if provided
      if (playerUsername.trim()) {
        const normalizedUsername = normalizeUsername(playerUsername.trim())
        
        if (!normalizedUsername || normalizedUsername.length < 3) {
          setError('Username must be at least 3 characters long')
          return
        }
        
        if (RESERVED_USERNAMES.has(normalizedUsername)) {
          setError('This username is reserved. Please choose another.')
          return
        }
        
        // Check if username is already taken
        const { data: existingUsername } = await supabase
          .from('profiles')
          .select('id, user_id')
          .eq('username', normalizedUsername)
          .maybeSingle()
        
        if (existingUsername && existingUsername.user_id !== playerProfile.user_id) {
          setError('This username is already taken. Please choose another.')
          return
        }
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

      // For players, ensure role is set (always set it to be safe)
      if (accountType === 'player') {
        updateData.role = 'player'
      } else if (accountType === 'parent') {
        updateData.role = 'parent'
      } else if (targetProfile.role === 'player') {
        // Fallback: if accountType is null but profile role is player, keep it
        updateData.role = 'player'
      }

      // For parents creating new player or updating player name, include name, username, and avatar
      if (accountType === 'parent' && playerProfile) {
        console.log('📝 Step 5 - Updating player profile:', {
          playerProfileId: playerProfile.id,
          playerProfileUserId: playerProfile.user_id,
          playerProfileRole: playerProfile.role,
          playerName: playerName.trim(),
          playerUsername: playerUsername.trim()
        })
        
        // Update player name if provided (for new players or if editing)
        if (playerName.trim()) {
          updateData.full_name = playerName.trim()
        }
        
        // Handle username: use parent-provided username if available, otherwise auto-generate
        const currentUsername = playerProfile.username || ''
        const isTemporaryUsername = currentUsername.startsWith('player-') && currentUsername.includes('-')
        
        if (playerUsername.trim()) {
          // Use parent-provided username (already validated above)
          updateData.username = normalizeUsername(playerUsername.trim())
          console.log('✅ Using parent-provided username:', updateData.username)
        } else if (isTemporaryUsername || !currentUsername) {
          // Auto-generate username from player name as fallback
          let generatedUsername = normalizeUsername(playerName.trim())
          
          // If username is reserved or empty, add a suffix
          if (RESERVED_USERNAMES.has(generatedUsername) || !generatedUsername) {
            generatedUsername = normalizeUsername(`${playerName.trim()}-${Date.now().toString().slice(-4)}`)
          }
          
          // Check if username is already taken
          const { data: existingUsername } = await supabase
            .from('profiles')
            .select('id, user_id')
            .eq('username', generatedUsername)
            .maybeSingle()
          
          // If taken, add a random suffix
          if (existingUsername && existingUsername.user_id !== playerProfile.user_id) {
            const randomSuffix = Math.random().toString(36).substring(2, 6)
            generatedUsername = normalizeUsername(`${playerName.trim()}-${randomSuffix}`)
            
            // Double-check this one too
            const { data: doubleCheck } = await supabase
              .from('profiles')
              .select('id, user_id')
              .eq('username', generatedUsername)
              .maybeSingle()
            
            if (doubleCheck && doubleCheck.user_id !== playerProfile.user_id) {
              // Last resort: use timestamp
              generatedUsername = normalizeUsername(`${playerName.trim()}-${Date.now().toString().slice(-6)}`)
            }
          }
          
          updateData.username = generatedUsername
          console.log('✅ Auto-generated username for player:', generatedUsername)
        }
        
        if (playerAvatarFile) {
          const fileExt = playerAvatarFile.name.split('.').pop()
          const fileName = `${playerProfile.user_id}-${Date.now()}.${fileExt}`
          const filePath = `player-avatars/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, playerAvatarFile)

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath)
            
            updateData.avatar_url = publicUrl
          }
        }
      } else if (accountType === 'parent' && !playerProfile) {
        // For parents editing existing player, update avatar
        if (playerAvatarFile) {
          const fileExt = playerAvatarFile.name.split('.').pop()
          const fileName = `${playerProfile.user_id}-${Date.now()}.${fileExt}`
          const filePath = `player-avatars/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, playerAvatarFile)

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath)
            
            updateData.avatar_url = publicUrl
          }
        }
      }

      console.log('📝 Step 5 - About to update profile:', {
        targetProfileUserId: targetProfile.user_id,
        targetProfileId: targetProfile.id,
        updateData: updateData,
        accountType: accountType,
        isParent: accountType === 'parent',
        hasPlayerProfile: !!playerProfile
      })

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', targetProfile.user_id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Step 5 - Update error:', updateError)
        throw updateError
      }
      
      console.log('✅ Step 5 data saved:', {
        profileId: updatedProfile?.id,
        userId: updatedProfile?.user_id,
        role: updatedProfile?.role,
        username: updatedProfile?.username,
        full_name: updatedProfile?.full_name,
        position: updatedProfile?.position,
        school: updatedProfile?.school,
        graduation_year: updatedProfile?.graduation_year,
        graduation_month: updatedProfile?.graduation_month,
        social_link: updatedProfile?.social_link
      })
      
      // If this is a parent updating a player profile, verify the link exists
      if (accountType === 'parent' && playerProfile) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: parentLink } = await supabase
            .from('parent_children')
            .select('*')
            .eq('parent_id', session.user.id)
            .eq('player_id', updatedProfile.user_id)
            .maybeSingle()
          
          console.log('🔗 Parent-Child link check:', {
            parentId: session.user.id,
            playerId: updatedProfile.user_id,
            linkExists: !!parentLink,
            linkData: parentLink
          })
        }
      }

      onComplete()
    } catch (err: any) {
      setError(err.message || 'Failed to save additional details')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h3 className="text-lg font-bold text-black mb-2">General Information</h3>
        <p className="text-gray-600 text-sm mb-4">
          {accountType === 'player'
            ? 'Add more information about yourself to help scouts find you.'
            : 'Add information about your child to help scouts find them.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

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
            <p className="text-xs text-gray-500 mt-1">
              {playerProfile?.full_name 
                ? 'Update the player\'s name if needed'
                : 'Enter the full name of the player'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Player Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={playerUsername}
                onChange={(e) => {
                  const value = e.target.value
                  // Only allow alphanumeric, hyphens, and underscores
                  const sanitized = value.replace(/[^a-zA-Z0-9-_]/g, '')
                  setPlayerUsername(sanitized)
                  // Clear error when typing
                  setError(null)
                }}
                placeholder="e.g., john-doe-2025"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  usernameStatus.available === true
                    ? 'border-green-500 focus:ring-green-500'
                    : usernameStatus.available === false
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-black'
                }`}
                required
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
              This will be used for the player's profile URL (e.g., /{playerUsername || 'username'}). Only letters, numbers, hyphens, and underscores allowed.
            </p>
            {playerUsername && (
              <p className="text-xs text-blue-600 mt-1">
                Preview: /{normalizeUsername(playerUsername)}
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
          onClick={onBack}
          className="flex-1 py-3 border border-gray-300 text-black rounded-lg font-medium hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}



