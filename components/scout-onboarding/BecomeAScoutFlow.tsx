'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter, useSearchParams } from 'next/navigation'
import Step1Information from './Step1Information'
import Step2SignUp from './Step2SignUp'
import Step3ProfileSetup from './Step3ProfileSetup'
import Step4ScoutApplication from './Step4ScoutApplication'
import type { Session } from '@supabase/supabase-js'

interface BecomeAScoutFlowProps {
  initialSession: Session | null
}

export default function BecomeAScoutFlow({ initialSession }: BecomeAScoutFlowProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [session, setSession] = useState<Session | null>(initialSession)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Get step from URL or determine based on state
  const urlStep = searchParams.get('step')
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (urlStep) {
      const step = parseInt(urlStep, 10)
      return step >= 1 && step <= 4 ? step : 1
    }
    return 1
  })

  // Check session and profile status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      setSession(currentSession)

      if (currentSession) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentSession.user.id)
          .maybeSingle()
        
        setProfile(profileData)

        // Check if already a scout - redirect to profile
        if (profileData?.role === 'scout') {
          router.push('/profile')
          return
        }

        // Check if they have a pending or approved application
        const { data: application } = await supabase
          .from('scout_applications')
          .select('status')
          .eq('user_id', currentSession.user.id)
          .in('status', ['pending', 'approved'])
          .maybeSingle()

        if (application) {
          // Already has application, redirect to profile
          router.push('/profile')
          return
        }

        // Auto-advance based on state if no URL step specified
        if (!urlStep) {
          const hasRequiredFields = profileData && 
            profileData.full_name && 
            profileData.username && 
            profileData.birthday

          if (!hasRequiredFields) {
            setCurrentStep(3) // Go to profile setup
            router.push('/scout?step=3')
          } else {
            setCurrentStep(4) // Go to application
            router.push('/scout?step=4')
          }
        }
      } else {
        // Not authenticated - should be on step 1 or 2
        if (!urlStep || parseInt(urlStep, 10) === 1) {
          setCurrentStep(1)
        } else if (parseInt(urlStep, 10) === 2) {
          setCurrentStep(2)
        } else {
          // Invalid step for unauthenticated user, go to step 1
          setCurrentStep(1)
          router.push('/scout?step=1')
        }
      }

      setLoading(false)
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession && currentStep === 2) {
        // Just signed up, move to step 3
        router.push('/scout?step=3')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router, urlStep, currentStep])

  const handleStepComplete = (step: number) => {
    const nextStep = step + 1
    if (nextStep <= 4) {
      setCurrentStep(nextStep)
      router.push(`/scout?step=${nextStep}`)
    }
  }

  const handleBack = () => {
    const prevStep = currentStep - 1
    if (prevStep >= 1) {
      setCurrentStep(prevStep)
      router.push(`/scout?step=${prevStep}`)
    }
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

  const steps = [
    { number: 1, label: 'Information', shortLabel: 'Info' },
    { number: 2, label: 'Sign Up', shortLabel: 'Sign Up' },
    { number: 3, label: 'Profile', shortLabel: 'Profile' },
    { number: 4, label: 'Application', shortLabel: 'Apply' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Progress Indicator */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-center gap-1 sm:gap-4 md:gap-8 overflow-x-auto">
            {steps.map((step, index) => {
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              const isUpcoming = currentStep < step.number

              return (
                <div key={step.number} className="flex items-center flex-shrink-0">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all ${
                        isCompleted
                          ? 'border-[#233dff]'
                          : isActive
                          ? 'border-[#233dff] ring-2 sm:ring-4 ring-[#233dff]/10'
                          : 'bg-gray-100 border-gray-300'
                      }`}
                      style={{
                        backgroundColor: isCompleted || isActive ? '#233dff' : undefined,
                      }}
                    >
                      {isCompleted ? (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className={`text-xs sm:text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-400'}`}>
                          {step.number}
                        </span>
                      )}
                    </div>
                    {/* Step Label */}
                    <span
                      className={`mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium transition-colors ${
                        isActive
                          ? 'text-[#233dff]'
                          : isCompleted
                          ? 'text-[#233dff]'
                          : 'text-gray-400'
                      }`}
                    >
                      <span className="hidden sm:inline">{step.label}</span>
                      <span className="sm:hidden">{step.shortLabel}</span>
                    </span>
                  </div>
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="w-4 sm:w-12 md:w-20 h-0.5 mx-1 sm:mx-2 md:mx-4 mt-[-16px] sm:mt-[-20px] relative flex-shrink-0">
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
          <Step1Information onNext={() => handleStepComplete(1)} />
        )}
        {currentStep === 2 && (
          <Step2SignUp 
            onComplete={() => handleStepComplete(2)} 
            onBack={handleBack}
          />
        )}
        {currentStep === 3 && session && (
          <Step3ProfileSetup 
            session={session}
            profile={profile}
            onComplete={() => handleStepComplete(3)}
            onBack={handleBack}
          />
        )}
        {currentStep === 4 && session && (
          <Step4ScoutApplication 
            session={session}
            profile={profile}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  )
}

