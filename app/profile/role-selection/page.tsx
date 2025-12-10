'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'

export default function RoleSelectionPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<'player' | 'parent' | 'scout' | 'skip' | null>(null)

  useEffect(() => {
    let isMounted = true
    
    // CRITICAL: Clear any stale selected_role from localStorage when page loads
    // This ensures a clean slate - role should only be set when user explicitly selects it
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selected_role')
    }
    
    const checkProfile = async () => {
      try {
        // Add timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('Profile check timeout - showing page anyway')
            setLoading(false)
          }
        }, 5000) // 5 second timeout

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        clearTimeout(timeoutId)
        
        if (sessionError) {
          console.error('Error getting session:', sessionError)
          if (isMounted) {
            setLoading(false)
          }
          return
        }
        
        if (!session) {
          if (isMounted) {
            router.push('/auth/signin')
            setLoading(false)
          }
          return
        }

        // Get user email and name from session
        if (session.user) {
          setUserEmail(session.user.email || null)
          setUserName(session.user.user_metadata?.full_name || session.user.user_metadata?.name || null)
        }

        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          // If it's a permission error or profile doesn't exist, that's fine - continue
          // Profile might not exist yet in the new flow
          if (profileError.code !== 'PGRST116') { // PGRST116 = no rows returned (expected)
            console.warn('Unexpected profile error, continuing anyway:', profileError.message)
          }
        }

        // CRITICAL FIX: If profile exists with role='player', fix it immediately
        if (profileData && profileData.role === 'player') {
          console.log('⚠️ Role selection - Found profile with role=player, fixing to user')
          const { error: fixError } = await supabase
            .from('profiles')
            .update({ role: 'user' })
            .eq('user_id', session.user.id)
          
          if (fixError) {
            console.error('❌ Failed to fix profile role:', fixError)
          } else {
            console.log('✅ Fixed profile role from player to user')
            // Re-fetch profile after fix
            const { data: fixedProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle()
            profileData = fixedProfile
          }
        }

        if (!isMounted) return

        // NEW FLOW: Allow role selection even if profile doesn't exist yet
        // Only redirect if profile exists and has a role other than 'user'
        if (profileData && profileData.role !== 'user') {
          // Already has a role selected - redirect to profile
          router.push('/profile')
          setLoading(false)
          return
        }

        // Set profile (may be null if doesn't exist yet)
        setProfile(profileData)
        setLoading(false)
      } catch (error) {
        console.error('Error in checkProfile:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkProfile()
    
    return () => {
      isMounted = false
    }
  }, [router, supabase])

  const handleContinue = () => {
    if (!selectedRole) return
    
    // Store selected role in localStorage for use in user-setup
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_role', selectedRole)
    }

    // NEW FLOW: After role selection, go to account info (user-setup)
    // The role will be applied after account info is completed
    if (selectedRole === 'skip') {
      // If skipping, still need to complete account info
      router.push('/profile/user-setup')
      return
    }

    // All roles go to user-setup first to complete account info
    router.push('/profile/user-setup')
  }

  const handleSkip = () => {
    // Store skip in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_role', 'skip')
    }
    router.push('/profile/user-setup')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={null}>
        <div className="max-w-2xl mx-auto py-12">
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-4">
            What would you like to do on Got1?
          </h1>
          <p className="text-gray-600 mb-8">
            Choose how you'd like to use Got1. You can always change this later in your profile settings.
          </p>

          <div className="space-y-4">
            {/* Player Option */}
            <button
              onClick={() => setSelectedRole('player')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                selectedRole === 'player'
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  selectedRole === 'player' ? 'border-black bg-black' : 'border-gray-300'
                }`}>
                  {selectedRole === 'player' && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-black mb-1">I'm a Player</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Get professional evaluations from verified college scouts. Share your film, receive detailed feedback, and improve your game.
                  </p>
                </div>
              </div>
            </button>

            {/* Parent Option */}
            <button
              onClick={() => setSelectedRole('parent')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                selectedRole === 'parent'
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  selectedRole === 'parent' ? 'border-black bg-black' : 'border-gray-300'
                }`}>
                  {selectedRole === 'parent' && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-black mb-1">I'm a Parent</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Manage your child's player page, purchase evaluations on their behalf, and help them get discovered by college scouts.
                  </p>
                </div>
              </div>
            </button>

            {/* Scout Option */}
            <button
              onClick={() => setSelectedRole('scout')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                selectedRole === 'scout'
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  selectedRole === 'scout' ? 'border-black bg-black' : 'border-gray-300'
                }`}>
                  {selectedRole === 'scout' && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-black mb-1">I'm a Scout</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Monetize your expertise by evaluating player film. Connect with talented athletes and build your reputation as a verified scout.
                  </p>
                </div>
              </div>
            </button>

            {/* Continue Button */}
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <button
                onClick={handleContinue}
                disabled={!selectedRole}
                className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
              
              {/* Skip Button */}
              <button
                onClick={handleSkip}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </DynamicLayout>
    </div>
  )
}

