'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter, useSearchParams } from 'next/navigation'
import Step1SignUpEmbedded from './Step1SignUpEmbedded'
import Step2BasicInfo from './Step2BasicInfo'
import Step3SelectRole from './Step3SelectRole'
import Step4ParentChoice from './Step4ParentChoice'
import Step4HudlLink from './Step4HudlLink'
import Step5GeneralInfo from './Step5GeneralInfo'
import Step6SpecificInfo from './Step6SpecificInfo'
import type { Session } from '@supabase/supabase-js'

interface PlayerParentFlowProps {
  initialSession: Session | null
}

export default function PlayerParentFlow({ initialSession }: PlayerParentFlowProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [session, setSession] = useState<Session | null>(initialSession)
  const [profile, setProfile] = useState<any>(null)
  const [playerProfile, setPlayerProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accountType, setAccountType] = useState<'player' | 'parent' | null>(null)
  
  // Get step from URL or default to step 1 (sign up)
  const urlStep = searchParams.get('step')
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (urlStep) {
      const step = parseInt(urlStep, 10)
      return step >= 1 && step <= 7 ? step : 1
    }
    return 1
  })

  // Ref to track session to prevent infinite loops
  const sessionRef = useRef<Session | null>(initialSession)
  
  // Update ref when session changes
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  // Ensure step 1 is in URL when visiting /playerparent without a step
  useEffect(() => {
    // Only update URL if there's no step param and we're on step 1
    // This ensures /playerparent shows step 1 with URL /playerparent?step=1
    if (!urlStep && currentStep === 1 && !loading) {
      router.replace('/playerparent?step=1')
    }
  }, [urlStep, currentStep, loading]) // Removed router from deps to prevent loops

  // Check session and profile status
  
  useEffect(() => {
    let isMounted = true
    
    const checkAuth = async () => {
      try {
        const urlStepNum = urlStep ? parseInt(urlStep, 10) : null
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (!isMounted) {
          setLoading(false)
          return
        }
        
        // Only update session if it actually changed
        if (currentSession?.user?.id !== sessionRef.current?.user?.id) {
          sessionRef.current = currentSession
          setSession(currentSession)
        }

        if (!currentSession || !currentSession.user) {
          // Not authenticated
          if (currentStep > 1) {
            // Not on step 1 - redirect to step 1
            if (urlStepNum !== 1) {
              if (isMounted) {
                setLoading(false)
              }
              router.replace('/playerparent?step=1')
              return
            }
          }
          // On step 1, just set loading to false
          if (isMounted) {
            setLoading(false)
          }
          return
        }

        // User is authenticated, fetch profile
        if (!currentSession?.user?.id) {
          if (isMounted) {
            setLoading(false)
          }
          return
        }
        
        let profileData: any = null
        try {
          const { data: fetchedProfileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', currentSession.user.id)
            .maybeSingle()
          
          if (!isMounted) {
            setLoading(false)
            return
          }
          
          if (error) {
            console.error('Error fetching profile:', error)
            // Don't block the flow if profile doesn't exist - that's expected for new users
            if (error.code !== 'PGRST116') { // PGRST116 = no rows returned (expected for new users)
              if (isMounted) {
                setLoading(false)
              }
              return
            }
          }
          
          profileData = fetchedProfileData || null
          // Set profile (can be null for new users)
          setProfile(profileData)
        } catch (fetchError: any) {
          console.error('Error fetching profile (catch):', fetchError)
          // If fetch fails completely, still allow user to continue (they can create profile)
          if (isMounted) {
            setProfile(null)
            setLoading(false)
          }
          return
        }

        // Check if they already have a role set (player, parent, or scout)
        // BUT only redirect if we're NOT in the onboarding flow (not on steps 1-7)
        // This allows users to complete onboarding even after selecting a role
        if (profileData?.role && profileData.role !== 'user') {
          const currentUrlStep = urlStep ? parseInt(urlStep, 10) : null
          const isInOnboarding = currentUrlStep !== null && currentUrlStep >= 1 && currentUrlStep <= 7
          
          // Only redirect to profile if we're not in onboarding
          if (!isInOnboarding) {
            if (isMounted) {
              setLoading(false)
            }
            router.replace('/profile')
            return
          }
        }

        // Get accountType from localStorage or profile FIRST (before calculating target step)
        // This ensures we use the correct accountType when determining which step to show
        let determinedAccountType: 'player' | 'parent' | null = null
        
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(`onboarding_accountType_${profileData?.user_id}`)
          if (stored === 'player' || stored === 'parent') {
            determinedAccountType = stored
          } else if (profileData?.role && profileData.role !== 'user') {
            // Read directly from profile role - this is the source of truth
            determinedAccountType = profileData.role as 'player' | 'parent'
          }
        }
        
        // Update state with the determined accountType
        if (determinedAccountType && determinedAccountType !== accountType) {
          setAccountType(determinedAccountType)
        }

        // For parents, load linked player profile if it exists
        if (determinedAccountType === 'parent' && profileData && currentSession?.user?.id) {
          try {
            const { data: parentLink } = await supabase
              .from('parent_children')
              .select('player_id')
              .eq('parent_id', currentSession.user.id)
              .limit(1)
              .maybeSingle()
            
            if (parentLink?.player_id) {
              const { data: linkedPlayerProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', parentLink.player_id)
                .maybeSingle()
              
              if (linkedPlayerProfile && isMounted) {
                console.log('✅ Loaded existing player profile for parent:', {
                  id: linkedPlayerProfile.id,
                  user_id: linkedPlayerProfile.user_id,
                  username: linkedPlayerProfile.username
                })
                setPlayerProfile(linkedPlayerProfile)
              }
            }
          } catch (linkError) {
            console.error('Error loading linked player profile:', linkError)
            // Don't block the flow if we can't load the linked player
          }
        }

        // Determine what step we should be on based on profile
        // Use determinedAccountType (not state) to ensure we have the correct value
        // If no profile exists, user should be on step 2 (basic info)
        let targetStep = 1
        if (!profileData || !profileData?.full_name || !profileData?.username || !profileData?.birthday) {
          targetStep = 2
        } else if (!profileData?.role || profileData.role === 'user') {
          targetStep = 3
        } else if (determinedAccountType === 'parent') {
          // For parents, check what step they should be on
          // Step 4: Tag/create player (always start here)
          // Step 5: Create/update player profile
          // Step 6: Add HUDL link
          // Step 7: Complete player info
          if (!profileData?.position || !profileData?.school || !profileData?.graduation_year) {
            // Missing position/school/graduation - go to step 5 (create player profile)
            targetStep = 5
          } else if (!profileData?.hudl_link) {
            // Has position/school but no HUDL link - go to step 6
            targetStep = 6
          } else {
            // Has everything - go to step 7 (complete info)
            targetStep = 7
          }
        } else {
          // For players
          if (!profileData?.hudl_link) {
            targetStep = 4
          } else if (!profileData?.position || !profileData?.school || !profileData?.graduation_year) {
            targetStep = 5
          } else {
            targetStep = 6
          }
        }

        // Only redirect if URL step doesn't match target step
        // BUT: Don't auto-navigate forward if user is actively on a form step (steps 2-7)
        // This prevents jumping ahead when user is still filling out forms
        // Only allow auto-navigation if user is behind where they should be (targetStep > urlStepNum)
        if (isMounted) {
          setLoading(false)
          
          if (urlStepNum !== targetStep) {
            // Check if we should allow auto-navigation
            // Don't auto-navigate forward if user is on a form step (steps 2-7) and target is ahead
            const isOnFormStep = urlStepNum !== null && urlStepNum >= 2 && urlStepNum <= 7
            const targetIsAhead = urlStepNum !== null && targetStep > urlStepNum
            // Allow navigation if: not on form step, OR target is ahead (user needs to catch up), OR on step 1
            const shouldAutoNavigate = !isOnFormStep || targetIsAhead || urlStepNum === 1
            
            if (shouldAutoNavigate) {
              // Only update state and redirect if auto-navigation is allowed
              setCurrentStep(targetStep)
              router.replace(`/playerparent?step=${targetStep}`)
            }
          } else {
            // URL matches, just update currentStep state if needed (without causing re-render loop)
            if (currentStep !== targetStep) {
              setCurrentStep(targetStep)
            }
          }
        }
      } catch (error) {
        console.error('Error in checkAuth:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkAuth()

    // Listen for auth changes - only trigger on actual auth state changes
    let lastSessionId: string | null = null
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const newSessionId = newSession?.user?.id || null
      if (isMounted && newSessionId !== lastSessionId) {
        lastSessionId = newSessionId
        // Only refresh if session actually changed (new session but no previous session)
        if (newSession && !sessionRef.current) {
          checkAuth()
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, router, urlStep]) // Removed session and currentStep from deps to prevent loops

  const handleStepComplete = (nextStep?: number) => {
    const next = nextStep || currentStep + 1
    const maxSteps = accountType === 'parent' ? 7 : 6
    if (next <= maxSteps) {
      setCurrentStep(next)
      router.push(`/playerparent?step=${next}`)
    }
  }

  const handleStepBack = () => {
    if (currentStep > 1) {
      const prev = currentStep - 1
      setCurrentStep(prev)
      router.push(`/playerparent?step=${prev}`)
    }
  }

  const handleAccountTypeChange = (type: 'player' | 'parent') => {
    setAccountType(type)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-lg font-medium text-gray-900">Loading...</p>
        </div>
      </div>
    )
  }

  // Define steps based on account type
  // Default to player flow (6 steps) when accountType is null (step 1)
  const getSteps = () => {
    if (accountType === 'parent') {
      return [
        { number: 1, label: 'Sign Up', shortLabel: 'Sign Up' },
        { number: 2, label: 'Basic Info', shortLabel: 'Basic' },
        { number: 3, label: 'Select Role', shortLabel: 'Role' },
        { number: 4, label: 'Link Player', shortLabel: 'Link' },
        { number: 5, label: 'HUDL Link', shortLabel: 'HUDL' },
        { number: 6, label: 'General Info', shortLabel: 'General' },
        { number: 7, label: 'Specific Info', shortLabel: 'Specific' },
      ]
    } else {
      // Default to player flow (6 steps) - this is used when accountType is null (step 1)
      return [
        { number: 1, label: 'Sign Up', shortLabel: 'Sign Up' },
        { number: 2, label: 'Basic Info', shortLabel: 'Basic' },
        { number: 3, label: 'Select Role', shortLabel: 'Role' },
        { number: 4, label: 'HUDL Link', shortLabel: 'HUDL' },
        { number: 5, label: 'General Info', shortLabel: 'General' },
        { number: 6, label: 'Specific Info', shortLabel: 'Specific' },
      ]
    }
  }

  const steps = getSteps()
  const maxSteps = steps.length

  return (
    <div className="min-h-screen bg-white">
      {/* Progress Indicator */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
            <div className="flex items-center justify-center gap-0.5 sm:gap-1 md:gap-2 overflow-x-auto">
              {steps.map((step, index) => {
                const isActive = currentStep === step.number
                const isCompleted = currentStep > step.number
                const isUpcoming = currentStep < step.number

                return (
                  <div key={step.number} className="flex items-center flex-shrink-0">
                    {/* Step Circle */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 transition-all ${
                          isCompleted
                            ? 'border-[#233dff]'
                            : isActive
                            ? 'border-[#233dff] ring-1 sm:ring-2 ring-[#233dff]/10'
                            : 'bg-gray-100 border-gray-300'
                        }`}
                        style={{
                          backgroundColor: isCompleted || isActive ? '#233dff' : undefined,
                        }}
                      >
                        {isCompleted ? (
                          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className={`text-[10px] sm:text-xs font-semibold ${isActive ? 'text-white' : 'text-gray-400'}`}>
                            {step.number}
                          </span>
                        )}
                      </div>
                      {/* Step Label */}
                      <span
                        className={`mt-0.5 sm:mt-1 text-[9px] sm:text-[10px] font-medium transition-colors whitespace-nowrap ${
                          isActive
                            ? 'text-[#233dff]'
                            : isCompleted
                            ? 'text-[#233dff]'
                            : 'text-gray-400'
                        }`}
                      >
                        {step.shortLabel}
                      </span>
                    </div>
                    {/* Connector Line */}
                    {index < steps.length - 1 && (
                      <div className="w-2 sm:w-4 md:w-6 h-0.5 mx-0.5 sm:mx-1 md:mx-1.5 mt-[-12px] sm:mt-[-14px] relative flex-shrink-0">
                        <div className="absolute inset-0 bg-gray-200" />
                        <div
                          className="absolute inset-0 transition-all"
                          style={{
                            backgroundColor: '#233dff',
                            width: currentStep > step.number ? '100%' : '0%',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {currentStep === 1 && (
          <Step1SignUpEmbedded onComplete={() => handleStepComplete(2)} />
        )}

        {currentStep === 2 && session && (
          <Step2BasicInfo 
            session={session}
            profile={profile}
            onComplete={() => handleStepComplete(3)}
          />
        )}

        {currentStep === 3 && session && profile && (
          <Step3SelectRole
            profile={profile}
            onBack={handleStepBack}
            onComplete={async () => {
              // Wait a brief moment to ensure the database update has propagated
              await new Promise(resolve => setTimeout(resolve, 500))
              
              // Refresh profile to get updated role - try multiple times if needed
              let refreshedProfile = null
              let attempts = 0
              const maxAttempts = 3
              
              while (!refreshedProfile && attempts < maxAttempts) {
                const { data, error } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('user_id', profile.user_id)
                  .maybeSingle()
                
                if (error) {
                  console.error(`❌ Error refreshing profile after step 3 (attempt ${attempts + 1}):`, error)
                } else if (data) {
                  refreshedProfile = data
                  console.log('✅ Profile refreshed after step 3:', {
                    user_id: refreshedProfile.user_id,
                    role: refreshedProfile.role,
                    attempt: attempts + 1
                  })
                } else {
                  console.warn(`⚠️ No profile data returned (attempt ${attempts + 1}), retrying...`)
                  attempts++
                  if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 500))
                  }
                }
              }
              
              if (refreshedProfile) {
                setProfile(refreshedProfile)
                const newRole = refreshedProfile.role as 'player' | 'parent'
                setAccountType(newRole)
                console.log('✅ AccountType state updated to:', newRole)
                console.log('✅ Profile role after Step 3:', refreshedProfile.role)
                handleStepComplete(4)
              } else {
                console.error('❌ Failed to refresh profile after multiple attempts')
                // Still proceed to next step, but log the issue
                // Try to get accountType from localStorage as fallback
                if (typeof window !== 'undefined') {
                  const storedAccountType = localStorage.getItem(`onboarding_accountType_${profile.user_id}`)
                  if (storedAccountType === 'player' || storedAccountType === 'parent') {
                    setAccountType(storedAccountType as 'player' | 'parent')
                    console.log('✅ Using stored accountType from localStorage:', storedAccountType)
                  }
                }
                handleStepComplete(4)
              }
            }}
          />
        )}

        {/* Step 4: Parent choice (tag existing or create new player) OR Player HUDL link */}
        {currentStep === 4 && session && profile && accountType === 'parent' && (
          <Step4ParentChoice
            profile={profile}
            onTagExisting={(playerProfile) => {
              console.log('🎯 Step 4 - Tagging existing player:', {
                id: playerProfile.id,
                user_id: playerProfile.user_id,
                role: playerProfile.role,
                username: playerProfile.username
              })
              setPlayerProfile(playerProfile)
              handleStepComplete(5)
            }}
            onCreateNew={(playerProfile) => {
              console.log('🎯 Step 4 - Creating new player:', {
                id: playerProfile.id,
                user_id: playerProfile.user_id,
                role: playerProfile.role,
                username: playerProfile.username
              })
              setPlayerProfile(playerProfile)
              handleStepComplete(5)
            }}
            onBack={handleStepBack}
          />
        )}

        {currentStep === 4 && session && profile && (accountType === 'player' || !accountType) && (
          <Step4HudlLink
            profile={profile}
            onComplete={() => handleStepComplete(5)}
            onBack={handleStepBack}
          />
        )}

        {/* Step 5: Create/update player profile (parents) OR General info (players) */}
        {currentStep === 5 && session && profile && accountType === 'parent' && (
          <Step5GeneralInfo
            profile={profile}
            playerProfile={playerProfile}
            accountType={accountType}
            onComplete={() => handleStepComplete(6)}
            onBack={handleStepBack}
          />
        )}

        {currentStep === 5 && session && profile && (accountType === 'player' || !accountType) && (
          <Step5GeneralInfo
            profile={profile}
            accountType={accountType || 'player'}
            onComplete={() => handleStepComplete(6)}
            onBack={handleStepBack}
          />
        )}

        {/* Step 6: Add HUDL link (parents) OR Complete player info (players) */}
        {currentStep === 6 && session && profile && accountType === 'parent' && (
          <Step4HudlLink
            profile={playerProfile}
            playerProfile={playerProfile}
            onComplete={() => handleStepComplete(7)}
            onBack={handleStepBack}
          />
        )}

        {currentStep === 6 && session && profile && (accountType === 'player' || !accountType) && (
          <Step6SpecificInfo
            profile={profile}
            accountType={accountType || 'player'}
            onBack={handleStepBack}
          />
        )}

        {/* Step 7: Complete player info (parents only) */}
        {currentStep === 7 && session && profile && accountType === 'parent' && (
          <Step6SpecificInfo
            profile={playerProfile}
            playerProfile={playerProfile}
            accountType={accountType}
            onBack={handleStepBack}
          />
        )}
      </div>
    </div>
  )
}



