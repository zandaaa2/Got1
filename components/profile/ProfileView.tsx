'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/shared/BackButton'
import Link from 'next/link'
import VerificationBadge from '@/components/shared/VerificationBadge'
import HeaderMenu from '@/components/shared/HeaderMenu'
import Modal from '@/components/shared/Modal'
import { getProfilePath } from '@/lib/profile-url'
import { EmptyState } from '@/components/shared/EmptyState'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'
import ShareButton from '@/components/evaluations/ShareButton'
import AuthModal from '@/components/auth/AuthModal'
import { collegeEntries } from '@/lib/college-data'
import PlayerOffersSection from '@/components/profile/PlayerOffersSection'
import PlayerTabs from '@/components/profile/PlayerTabs'
import JoinWaitlist from '@/components/profile/JoinWaitlist'
import ScoutProfileSections from '@/components/profile/ScoutProfileSections'
import PurchaseEvaluation from '@/components/profile/PurchaseEvaluation'


const cardClass = 'bg-white border border-gray-200 rounded-2xl shadow-sm'

const ProfileHeroSkeleton = () => (
  <div className={`${cardClass} p-4 md:p-6 animate-pulse flex flex-row flex-wrap md:flex-nowrap gap-4 md:gap-6`}>
    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-200 mx-auto md:mx-0" />
    <div className="flex-1 w-full space-y-3">
      <div className="h-6 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-4 bg-gray-200 rounded w-full" />
    </div>
  </div>
)

const ProfileCtaSkeleton = () => (
  <div className={`${cardClass} p-4 md:p-6 animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-4`}>
    <div className="flex items-center gap-4">
      <div className="h-4 w-24 bg-gray-200 rounded" />
      <div className="h-4 w-24 bg-gray-200 rounded" />
    </div>
    <div className="h-10 w-40 bg-gray-200 rounded-full" />
  </div>
)

const EvaluationListSkeleton = () => (
  <div className={`${cardClass} p-4 md:p-6 space-y-4`}>
    {[...Array(3)].map((_, idx) => (
      <div key={idx} className="flex items-start gap-3 md:gap-4">
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    ))}
  </div>
)

const ProfileSkeletonPage = () => (
  <div className="space-y-6">
    <ProfileHeroSkeleton />
    <ProfileCtaSkeleton />
    <EvaluationListSkeleton />
  </div>
)

const emptyEvaluationIcon = (
  <svg
    className="h-8 w-8"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="3" width="16" height="18" rx="2" ry="2" />
    <path d="M9 7h6" />
    <path d="M9 11h6" />
    <path d="M9 15h4" />
  </svg>
)

export interface ProfileViewProps {
  profile: any
  isOwnProfile: boolean
  parentProfile?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

interface Evaluation {
  id: string
  notes: string | null
  created_at: string
  price?: number | null
  share_token?: string | null
  scout_id?: string | null
  player_id?: string | null
  scout?: {
    id: string
    user_id?: string | null
    full_name: string | null
    avatar_url: string | null
    organization: string | null
    username: string | null
  } | null
  player?: {
    id: string
    user_id?: string | null
    full_name: string | null
    avatar_url: string | null
    school: string | null
    graduation_year: number | null
    username: string | null
  } | null
}

export default function ProfileView({ profile, isOwnProfile, parentProfile }: ProfileViewProps) {
  const [requesting, setRequesting] = useState(false)
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [showMoreInfo, setShowMoreInfo] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [minimizedEvals, setMinimizedEvals] = useState<Set<string>>(new Set())
  const [isHydrated, setIsHydrated] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [showSignUpModal, setShowSignUpModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup')
  const [bioExpanded, setBioExpanded] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()
  const profileAvatarUrl = isMeaningfulAvatar(profile.avatar_url) ? profile.avatar_url : null
  const profilePath = getProfilePath(profile.id, profile.username)
  const appUrl =
    (process.env.NEXT_PUBLIC_APP_URL || 'https://got1.app').replace(/\/$/, '')
  const fullProfileUrl = `${appUrl}${profilePath}`
  const displayProfileUrl = `${appUrl.replace(/^https?:\/\//, '')}${profilePath}`
  const profileGradientKey =
    profile.user_id || profile.id || profile.username || profile.full_name || 'profile'

  const handleCopyProfileUrl = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullProfileUrl)
      } else {
        const tempInput = document.createElement('textarea')
        tempInput.value = fullProfileUrl
        tempInput.setAttribute('readonly', '')
        tempInput.style.position = 'absolute'
        tempInput.style.left = '-9999px'
        document.body.appendChild(tempInput)
        tempInput.select()
        document.execCommand('copy')
        document.body.removeChild(tempInput)
      }
      setCopyStatus('copied')
      window.setTimeout(() => setCopyStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to copy profile link:', error)
      setCopyStatus('error')
      window.setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }

  
  const toggleEvalMinimize = (evalId: string) => {
    setMinimizedEvals(prev => {
      const newSet = new Set(prev)
      if (newSet.has(evalId)) {
        newSet.delete(evalId)
      } else {
        newSet.add(evalId)
      }
      return newSet
    })
  }
  
  // Test accounts that should show the badge
  const testAccountNames = ['russell westbrooks', 'ray lewois', 'ella k']
  
  const isTestAccount = (fullName: string | null) => {
    if (!fullName) return false
    return testAccountNames.includes(fullName.toLowerCase())
  }

  // Get current user ID and profile
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setCurrentUserId(session.user.id)
        setIsSignedIn(true)
        
        // Load current user's profile for purchase evaluation
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()
        
        setCurrentUserProfile(userProfile)
      } else {
        setIsSignedIn(false)
        setCurrentUserProfile(null)
      }
    }
    getCurrentUser()
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsHydrated(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    loadEvaluations()
  }, [profile.id, profile.role])

  /**
   * Loads evaluations for the current profile and manually joins profile data.
   * Since evaluations reference auth.users, we need to manually join with profiles.
   */
  const loadEvaluations = async () => {
    try {
      setLoading(true)
      
      // First, get the evaluations (including share_token for sharing if column exists)
      let evaluationsData
      let evaluationsError
      
      try {
        // Try with share_token first
        let query = supabase
          .from('evaluations')
          .select('id, notes, created_at, scout_id, player_id, share_token, price')

        if (profile.role === 'player') {
          // Get evaluations received by this player
          query = query.eq('player_id', profile.user_id).eq('status', 'completed')
        } else {
          // Get evaluations contributed by this scout
          query = query.eq('scout_id', profile.user_id).eq('status', 'completed')
        }

        query = query.order('created_at', { ascending: false })

        const result = await query
        evaluationsData = result.data
        evaluationsError = result.error

        // If error is due to share_token column not existing, try without it
        if (evaluationsError && (evaluationsError.code === '42703' || evaluationsError.message?.includes('column "share_token" does not exist'))) {
          console.warn('share_token column not found, fetching without it')
          let queryWithoutToken = supabase
            .from('evaluations')
            .select('id, notes, created_at, scout_id, player_id, price')

          if (profile.role === 'player') {
            queryWithoutToken = queryWithoutToken.eq('player_id', profile.user_id).eq('status', 'completed')
          } else {
            queryWithoutToken = queryWithoutToken.eq('scout_id', profile.user_id).eq('status', 'completed')
          }

          const resultWithoutToken = await queryWithoutToken.order('created_at', { ascending: false })
          evaluationsData = resultWithoutToken.data
          evaluationsError = resultWithoutToken.error
          
          // Add share_token as null if column doesn't exist
          if (evaluationsData) {
            evaluationsData = evaluationsData.map((e: any) => ({ ...e, share_token: null }))
          }
        }
      } catch (error) {
        console.error('Error loading evaluations:', error)
        evaluationsError = error as any
      }

      if (evaluationsError && evaluationsError.code !== '42703') {
        throw evaluationsError
      }

      if (!evaluationsData || evaluationsData.length === 0) {
        setEvaluations([])
        return
      }

      // Get unique user IDs from evaluations
      const userIds = new Set<string>()
      evaluationsData.forEach((evaluation) => {
        if (evaluation.scout_id) userIds.add(evaluation.scout_id)
        if (evaluation.player_id) userIds.add(evaluation.player_id)
      })

      // Fetch profiles for those user IDs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, organization, school, graduation_year, username')
        .in('user_id', Array.from(userIds))

      if (profilesError) throw profilesError

      // Manually join evaluations with profiles
      const evaluationsWithProfiles = evaluationsData.map((evaluation) => {
        const scoutProfile = profilesData?.find((p) => p.user_id === evaluation.scout_id) || null
        const playerProfile = profilesData?.find((p) => p.user_id === evaluation.player_id) || null

        return {
          id: evaluation.id,
          notes: evaluation.notes,
          created_at: evaluation.created_at,
          scout_id: evaluation.scout_id,
          player_id: evaluation.player_id,
          price: evaluation.price || 0,
          scout: scoutProfile ? {
            id: scoutProfile.id,
            user_id: scoutProfile.user_id,
            full_name: scoutProfile.full_name,
            avatar_url: scoutProfile.avatar_url,
            organization: scoutProfile.organization,
            username: scoutProfile.username,
          } : null,
          player: playerProfile ? {
            id: playerProfile.id,
            user_id: playerProfile.user_id,
            full_name: playerProfile.full_name,
            avatar_url: playerProfile.avatar_url,
            school: playerProfile.school,
            graduation_year: playerProfile.graduation_year,
            username: playerProfile.username,
          } : null,
        }
      })

      // Sort evaluations by price: free first (price = 0), then lowest to highest
      evaluationsWithProfiles.sort((a, b) => {
        const priceA = a.price || 0
        const priceB = b.price || 0
        // Free evals (price = 0) come first
        if (priceA === 0 && priceB !== 0) return -1
        if (priceA !== 0 && priceB === 0) return 1
        // Then sort by price ascending
        return priceA - priceB
      })

      setEvaluations(evaluationsWithProfiles as Evaluation[])
    } catch (error) {
      console.error('Error loading evaluations:', error)
      setEvaluations([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handles the request to purchase an evaluation from this scout.
   * Redirects to the purchase page if signed in, or shows sign-up modal if not.
   */
  const handleRequestEvaluation = async () => {
    if (!profile || profile.role !== 'scout') return

    // Check if user is signed in
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      // Show sign-up modal instead of redirecting
      setAuthMode('signup')
      setShowSignUpModal(true)
      return
    }

    setRequesting(true)
    router.push(`/profile/${profile.id}/purchase`)
    setRequesting(false)
  }

  /**
   * Handles scout giving a free evaluation to a player.
   * Creates a free evaluation and navigates to the evaluation detail page.
   */
  const handleGiveFreeEval = async () => {
    if (!profile || profile.role !== 'player') return
    if (!currentUserProfile || currentUserProfile.role !== 'scout') return

    try {
      setRequesting(true)
      
      const response = await fetch('/api/evaluation/give-free', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: profile.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create free evaluation')
      }

      // Navigate to the evaluation detail page
      if (data.evaluationId) {
        router.push(`/evaluations/${data.evaluationId}`)
      }
    } catch (error: any) {
      console.error('Error giving free evaluation:', error)
      alert(error.message || 'Failed to create free evaluation. Please try again.')
    } finally {
      setRequesting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    })
  }

  // Helper function to find college match for team logo
  const findCollegeMatch = useCallback((organization: string | null) => {
    if (!organization) return null
    const normalized = organization.toLowerCase().trim()
    const normalizedSimple = normalized.replace(/[^a-z0-9]/g, '')
    
    return (
      collegeEntries.find((college) => college.name.toLowerCase() === normalized) ||
      collegeEntries.find((college) => normalized === college.name.toLowerCase().replace('university of ', '') && college.division === 'FBS') ||
      collegeEntries.find((college) => normalized.includes(college.name.toLowerCase())) ||
      collegeEntries.find((college) => college.name.toLowerCase().includes(normalized)) ||
      collegeEntries.find((college) => normalizedSimple === college.name.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
      collegeEntries.find((college) => normalizedSimple.includes(college.name.toLowerCase().replace(/[^a-z0-9]/g, '')))
    )
  }, [])

  if (!isHydrated) {
    return (
      <div className="max-w-4xl mx-auto">
        <ProfileSkeletonPage />
      </div>
    )
  }

  if (profile.role === 'player') {
    // Player View
    return (
      <div className="max-w-4xl mx-auto">
        {isSignedIn && (
          <div className="mb-4 md:mb-6">
            <BackButton fallbackUrl="/browse" />
          </div>
        )}

        {/* Player Profile Section */}
        <div className="relative flex flex-row flex-wrap md:flex-nowrap items-start gap-3 md:gap-4 mb-4 md:mb-6 bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5 md:p-6">
          <div className="flex flex-col items-start gap-2 flex-shrink-0">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden">
              {profileAvatarUrl && !imageErrors.has(`profile-${profile.id}`) ? (
                <Image
                  src={profileAvatarUrl}
                  alt={profile.full_name || 'Player'}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  onError={() => {
                    setImageErrors((prev) => new Set(prev).add(`profile-${profile.id}`))
                  }}
                  priority
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${getGradientForId(profileGradientKey)}`}>
                  <span className="text-white text-2xl font-semibold">
                    {profile.full_name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 w-full text-left flex items-center">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-1 mb-1">
                <h1 className="text-lg md:text-xl font-bold text-black break-words">
                  {profile.full_name || 'Unknown Player'}
                </h1>
                {isTestAccount(profile.full_name) && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded flex-shrink-0 whitespace-nowrap">
                    test account
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-gray-600 mb-1">
                {profile.username && <span className="text-gray-500">@{profile.username}</span>}
                {!isOwnProfile && <span className="text-gray-400">•</span>}
                {!isOwnProfile && (
                  <button
                    onClick={() => setShowMoreInfo(true)}
                    className="interactive-press text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    Details
                  </button>
                )}
              </div>
              <div className="mb-1.5">
                <p className="text-xs md:text-sm text-blue-600 flex flex-wrap items-center gap-1">
                  {profile.school && (
                    <>
                      <span>{profile.school}</span>
                      {profile.state && <span>, {profile.state}</span>}
                      {profile.classification && <span> ({profile.classification})</span>}
                    </>
                  )}
                  {(() => {
                    let positions: string[] = []
                    try {
                      // Try to load from positions JSONB array first (new format)
                      if (profile.positions && typeof profile.positions === 'string') {
                        positions = JSON.parse(profile.positions)
                      } else if (Array.isArray(profile.positions)) {
                        positions = profile.positions
                      } else if (profile.position) {
                        // Fall back to single position field (backward compatibility)
                        positions = [profile.position]
                      }
                    } catch {
                      // If parsing fails, fall back to single position
                      if (profile.position) {
                        positions = [profile.position]
                      }
                    }
                    
                    if (positions.length > 0) {
                      return (
                        <>
                          {(profile.school || profile.state || profile.classification) && (
                            <span className="text-gray-400">•</span>
                          )}
                          <span>{positions.join(', ')}</span>
                        </>
                      )
                    }
                    return null
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* For unauthenticated users viewing player profiles: Show only profile card + blurred evaluations */}
        {!isSignedIn ? (
          <div className="mb-6 md:mb-8 mt-6 md:mt-8 relative min-h-[400px]">
            {/* Blurred background content */}
            <div className="filter blur-md pointer-events-none opacity-50">
              {loading ? (
                <EvaluationListSkeleton />
              ) : evaluations.length > 0 ? (
                <div className="space-y-6">
                  {evaluations.slice(0, 3).map((evaluation) => (
                    <div key={evaluation.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6">
                      <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6">
                  <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Sign in overlay - centered and properly positioned */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl border border-gray-300 p-6 md:p-8 max-w-md mx-4 text-center z-10">
                <h3 className="text-xl md:text-2xl font-bold text-black mb-3">
                  Sign in to view evaluations
                </h3>
                <p className="text-gray-600 mb-6">
                  Create an account or sign in to see detailed evaluations
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setShowSignUpModal(true)
                      setAuthMode('signup')
                    }}
                    className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => {
                      setShowSignUpModal(true)
                      setAuthMode('signin')
                    }}
                    className="flex-1 px-6 py-3 bg-gray-100 text-black rounded-lg hover:bg-gray-200 font-medium transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Player Tabs - Show for signed-in users or all scout profiles */
          <PlayerTabs
          playerInfoContent={
            <>
              {/* Player Stats Section */}
              {(profile.gpa || profile.weight || profile.height || profile.forty_yard_dash || 
                profile.bench_max || profile.squat_max || profile.clean_max) && (
                <div className="surface-card mb-6 md:mb-8 p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-bold text-black mb-4 md:mb-6">Athletic Information</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {profile.gpa && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">GPA</p>
                        <p className="text-lg md:text-xl font-semibold text-black">{profile.gpa.toFixed(2)}</p>
                      </div>
                    )}
                    {profile.height && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Height</p>
                        <p className="text-lg md:text-xl font-semibold text-black">{profile.height}</p>
                      </div>
                    )}
                    {profile.weight && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Weight</p>
                        <p className="text-lg md:text-xl font-semibold text-black">{profile.weight} lbs</p>
                      </div>
                    )}
                    {profile.forty_yard_dash && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">40-Yard Dash</p>
                        <p className="text-lg md:text-xl font-semibold text-black">{profile.forty_yard_dash.toFixed(2)}s</p>
                      </div>
                    )}
                    {profile.bench_max && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Bench Max</p>
                        <p className="text-lg md:text-xl font-semibold text-black">{profile.bench_max} lbs</p>
                      </div>
                    )}
                    {profile.squat_max && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Squat Max</p>
                        <p className="text-lg md:text-xl font-semibold text-black">{profile.squat_max} lbs</p>
                      </div>
                    )}
                    {profile.clean_max && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Clean Max</p>
                        <p className="text-lg md:text-xl font-semibold text-black">{profile.clean_max} lbs</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Parent Information Section */}
              {profile.role === 'player' && parentProfile && parentProfile.id && (
                <div className="surface-card mb-6 md:mb-8 p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-bold text-black mb-4 md:mb-6">Parent Information</h2>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      {parentProfile.avatar_url && isMeaningfulAvatar(parentProfile.avatar_url) ? (
                        <Image
                          src={parentProfile.avatar_url}
                          alt={parentProfile.full_name || 'Parent'}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${getGradientForId(parentProfile.id || 'default')}`}>
                          <span className="text-white text-lg font-semibold">
                            {parentProfile.full_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-black">{parentProfile.full_name || 'Parent'}</p>
                      <p className="text-sm text-gray-600">Managing this player profile</p>
                    </div>
                  </div>
                </div>
              )}

              {/* College Offers Section */}
              <div className="mb-6 md:mb-8">
                <PlayerOffersSection
                  profileId={profile.id}
                  userId={profile.user_id}
                  isOwnProfile={isOwnProfile}
                />
              </div>

              {/* Give Eval Button - Only visible to scouts viewing player profiles */}
              {!isOwnProfile && 
               isSignedIn && 
               currentUserProfile?.role === 'scout' && 
               profile.role === 'player' && (
                <div className="mb-6 md:mb-8">
                  <button
                    onClick={handleGiveFreeEval}
                    disabled={requesting}
                    className="interactive-press w-full px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 font-semibold text-sm md:text-base transition-colors disabled:active:scale-100"
                  >
                    {requesting ? 'Creating...' : 'Give eval'}
                  </button>
                </div>
              )}
            </>
          }
          evaluationsContent={
            <div className="mb-6 md:mb-8 relative">
              {loading ? (
                <EvaluationListSkeleton />
              ) : evaluations.length === 0 && isSignedIn ? (
                <EmptyState
                  icon={emptyEvaluationIcon}
                  title="No evaluations yet"
                  description={
                    isOwnProfile
                      ? 'Request an evaluation from a scout to see it appear here.'
                      : 'This player has not received any public evaluations yet.'
                  }
                  action={
                    isOwnProfile ? (
                      <Link
                        href="/discover"
                        className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                      >
                        Browse scouts
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7M4 12h12" />
                        </svg>
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <div className="relative">
                  <div className={`space-y-6 ${!isSignedIn ? 'filter blur-md' : ''}`}>
                    {isSignedIn ? (
                      evaluations.map((evaluation) => {
                        const scoutAvatarUrl = isMeaningfulAvatar(evaluation.scout?.avatar_url)
                          ? evaluation.scout?.avatar_url ?? undefined
                          : undefined
                        const scoutGradientKey =
                          evaluation.scout?.user_id ||
                          evaluation.scout_id ||
                          evaluation.scout?.id ||
                          evaluation.scout?.username ||
                          evaluation.id
                        const showScoutAvatar =
                          Boolean(scoutAvatarUrl) && !imageErrors.has(`scout-${evaluation.id}`)

                        return (
                          <div key={evaluation.id} className="border-b border-gray-200 pb-4 md:pb-6 last:border-0">
                            <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                              <Link 
                                href={evaluation.scout?.id ? getProfilePath(evaluation.scout.id, evaluation.scout.username) : '#'}
                                className="flex items-start gap-3 md:gap-4 hover:opacity-90 transition-opacity cursor-pointer flex-1"
                              >
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0">
                                  {showScoutAvatar ? (
                                    <Image
                                      src={scoutAvatarUrl!}
                                      alt={evaluation.scout?.full_name || 'Scout'}
                                      width={64}
                                      height={64}
                                      className="w-full h-full object-cover"
                                      onError={() => {
                                        setImageErrors((prev) => new Set(prev).add(`scout-${evaluation.id}`))
                                      }}
                                      unoptimized
                                    />
                                  ) : (
                                    <div className={`w-full h-full flex items-center justify-center ${getGradientForId(scoutGradientKey)}`}>
                                      <span className="text-white text-xl font-semibold">
                                        {evaluation.scout?.full_name?.charAt(0).toUpperCase() || '?'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-bold text-black text-base md:text-lg truncate">
                                    {evaluation.scout?.full_name || 'Unknown Scout'}
                                  </h3>
                                  {evaluation.price === 0 && (
                                    <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded flex-shrink-0">
                                      Free
                                    </span>
                                  )}
                                </div>
                                <p className="text-black text-xs md:text-sm mb-1 truncate">
                                  {evaluation.scout?.organization || 'Scout'}
                                </p>
                                <p className="text-black text-xs md:text-sm text-gray-600">
                                  {formatDate(evaluation.created_at)}
                                </p>
                              </div>
                            </Link>
                            {evaluation.notes && (
                              <button
                                onClick={() => toggleEvalMinimize(evaluation.id)}
                                className="flex-shrink-0 text-gray-500 hover:text-black transition-colors p-1"
                                title={minimizedEvals.has(evaluation.id) ? 'Expand' : 'Minimize'}
                              >
                                <svg
                                  className={`w-5 h-5 transition-transform ${minimizedEvals.has(evaluation.id) ? '' : 'rotate-180'}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                            {evaluation.notes && !minimizedEvals.has(evaluation.id) && (
                              <div className="pl-0 md:pl-20 mt-4 md:mt-0">
                                <p className="text-black leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                                  {evaluation.notes}
                                </p>
                              </div>
                            )}
                            {/* Share button - bottom left underneath evaluation (always visible) */}
                            <div className="pl-0 md:pl-20 mt-4 md:mt-2 flex items-start">
                              <ShareButton 
                                evaluationId={evaluation.id} 
                                {...(currentUserId && { userId: currentUserId })}
                                evaluation={{
                                  id: evaluation.id,
                                  share_token: evaluation.share_token || null,
                                  status: 'completed',
                                  ...(evaluation.player_id && { player_id: evaluation.player_id }),
                                  scout: evaluation.scout ? {
                                    full_name: evaluation.scout.full_name,
                                    organization: evaluation.scout.organization,
                                  } : null,
                                }}
                              />
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <EvaluationListSkeleton />
                    )}
                  </div>
                  {/* Sign in/Sign up overlay for non-signed-in users */}
                  {!isSignedIn && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-40 backdrop-blur-[2px]">
                      <div className="bg-white rounded-lg shadow-xl border border-gray-300 p-6 md:p-8 max-w-md mx-4 text-center">
                        <h3 className="text-xl md:text-2xl font-bold text-black mb-3">
                          Sign in to view evaluations
                        </h3>
                        <p className="text-gray-600 mb-6">
                          Create an account or sign in to see detailed evaluations
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Link
                            href="/auth/signup"
                            className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
                          >
                            Sign Up
                          </Link>
                          <Link
                            href="/auth/signin"
                            className="flex-1 px-6 py-3 bg-gray-100 text-black rounded-lg hover:bg-gray-200 font-medium transition-colors"
                          >
                            Sign In
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          }
          evaluationsCount={evaluations.length}
          />
        )}

        {/* More Info Modal */}
        {showMoreInfo && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4" 
            onClick={() => setShowMoreInfo(false)}
          >
            <div 
              className="surface-card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in p-4 md:p-6" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-xl md:text-2xl font-bold text-black">
                  More Information
                </h3>
                <button
                  onClick={() => setShowMoreInfo(false)}
                  className="interactive-press text-gray-500 hover:text-black text-2xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              
              <div className='space-y-5 md:space-y-6'>
                {profile.bio && (
                  <div>
                    <h4 className="text-base md:text-lg font-semibold text-black mb-2">Bio</h4>
                    <p className="text-sm md:text-base text-black leading-relaxed whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  </div>
                )}
                
                {profile.hudl_link && (
                  <div>
                    <h4 className="text-base md:text-lg font-semibold text-black mb-2">Hudl Profile</h4>
                    <a
                      href={profile.hudl_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm md:text-base text-blue-600 hover:underline break-words"
                    >
                      {profile.hudl_link.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                
                {profile.social_link && (
                  <div>
                    <h4 className="text-base md:text-lg font-semibold text-black mb-2">Social</h4>
                    <a
                      href={profile.social_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm md:text-base text-blue-600 hover:underline break-words"
                    >
                      {profile.social_link.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                
                {(!profile.bio && !profile.hudl_link && !profile.social_link) && (
                  <p className="text-sm md:text-base text-gray-500">No additional information available.</p>
                )}
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => setShowMoreInfo(false)}
                  className="interactive-press w-full px-6 py-3 border border-gray-300 bg-white text-black rounded-full hover:bg-gray-50 font-medium text-sm md:text-base transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Scout/Pro View
  const isUnclaimed = profile.profile_claimed === false
  const collegeMatch = findCollegeMatch(profile.organization)
  const jobTitle = profile.position && profile.organization
    ? `${profile.position} at ${profile.organization}`
    : profile.position || profile.organization || 'Football Expert'

  return (
    <div className="max-w-6xl mx-auto relative">
      {isSignedIn && (
        <div className="mb-4 md:mb-6 relative z-30" style={{ pointerEvents: 'auto' }}>
          <BackButton fallbackUrl="/browse" />
        </div>
      )}

      {/* Main Layout: Left Sidebar + Right Purchase */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8">
        {/* Left Sidebar - Profile Info */}
        <div className="md:w-80 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6 relative">
            {/* Share Menu Button - Top Right inside profile card */}
            {!isOwnProfile && (
              <div className="absolute top-4 right-4 z-10">
                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="More options"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  {showShareMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowShareMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                        <button
                          onClick={async () => {
                            await handleCopyProfileUrl()
                            // Don't close menu immediately - show feedback first
                            setTimeout(() => {
                              setShowShareMenu(false)
                            }, 2000)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors relative"
                        >
                          {copyStatus === 'copied' ? (
                            <>
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-green-600 font-medium">Copied!</span>
                            </>
                          ) : copyStatus === 'error' ? (
                            <>
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span className="text-red-600">Failed</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                              Share profile
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (!isSignedIn) {
                              router.push('/auth/signin')
                              setShowShareMenu(false)
                              return
                            }
                            setShowShareMenu(false)
                            setShowReportModal(true)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Report profile
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Scout Profile Picture - Large */}
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-full overflow-hidden">
                {profileAvatarUrl && !imageErrors.has(`profile-${profile.id}`) ? (
                  <Image
                    src={profileAvatarUrl}
                    alt={profile.full_name || 'Scout'}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                    onError={() => {
                      setImageErrors((prev) => new Set(prev).add(`profile-${profile.id}`))
                    }}
                    priority
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-5xl font-semibold text-white ${getGradientForId(profileGradientKey)}`}>
                    {profile.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
            </div>

            {/* Role + Team */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-xl font-bold text-black">
                  {profile.full_name || 'Unknown Scout'}
                </h1>
                <VerificationBadge className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-600">{jobTitle}</p>
              {collegeMatch && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  {collegeMatch.logo && (
                    <div className="w-6 h-6 rounded-full bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                      <Image
                        src={collegeMatch.logo}
                        alt={collegeMatch.name}
                        width={24}
                        height={24}
                        className="object-contain w-full h-full"
                        unoptimized
                      />
                    </div>
                  )}
                  <p className="text-sm text-gray-500">{collegeMatch.name}</p>
                </div>
              )}
            </div>

            {/* Divider Line */}
            <div className="border-t border-gray-200"></div>

            {/* Work History - Show for all users */}
            {profile.work_history && (
              <div>
                <h3 className="text-sm font-semibold text-black mb-2">Work History</h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {profile.work_history}
                </p>
              </div>
            )}

            {/* Additional Info - Show under work history if available */}
            {profile.additional_info && (
              <div>
                <h3 className="text-sm font-semibold text-black mb-2">Additional Information</h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {profile.additional_info}
                </p>
              </div>
            )}

            {/* Social Media Links */}
            {profile.social_link && (
              <div>
                <h3 className="text-sm font-semibold text-black mb-2">Social Media</h3>
                <a
                  href={profile.social_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {profile.social_link.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Purchase/JoinWaitlist */}
        <div className="flex-1">
          {isOwnProfile ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-600">This is your profile.</p>
            </div>
          ) : isUnclaimed ? (
            <JoinWaitlist 
              scoutId={profile.id} 
              scoutName={profile.full_name || 'This scout'} 
            />
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <PurchaseEvaluation 
                scout={profile} 
                player={currentUserProfile?.role === 'player' ? currentUserProfile : null}
                isSignedIn={isSignedIn}
                onSignInClick={() => {
                  setShowSignUpModal(true)
                  setAuthMode('signin')
                }}
                onSignUpClick={() => {
                  setShowSignUpModal(true)
                  setAuthMode('signup')
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sections - Why Valuable, What to Expect, FAQ */}
      {!isOwnProfile && (
        <ScoutProfileSections scoutName={profile.full_name || 'This scout'} isSignedIn={isSignedIn} />
      )}

      {/* Edit Profile Button - Only for own profile */}
      {isOwnProfile && (
        <div className="mb-6 md:mb-8">
          <a
            href="/profile/edit"
            className="interactive-press block w-full px-4 md:px-6 py-2.5 md:py-3 border border-black text-black rounded-lg hover:bg-gray-50 text-center font-medium text-sm md:text-base"
          >
            Edit Profile
          </a>
        </div>
      )}

      {/* More Info Modal */}
      {showMoreInfo && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4" 
          onClick={() => setShowMoreInfo(false)}
        >
          <div 
            className="surface-card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in p-4 md:p-6" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-black">
                More Information
              </h3>
              <button
                onClick={() => setShowMoreInfo(false)}
                className="interactive-press text-gray-500 hover:text-black text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className='space-y-5 md:space-y-6'>
              {profile.work_history && (
                <div>
                  <h4 className="text-base md:text-lg font-semibold text-black mb-2">Work History</h4>
                  <p className="text-sm md:text-base text-black leading-relaxed whitespace-pre-wrap">
                    {profile.work_history}
                  </p>
                </div>
              )}
              
              {profile.additional_info && (
                <div>
                  <h4 className="text-base md:text-lg font-semibold text-black mb-2">Additional Information</h4>
                  <p className="text-sm md:text-base text-black leading-relaxed whitespace-pre-wrap">
                    {profile.additional_info}
                  </p>
                </div>
              )}
              
              {profile.bio && (
                <div>
                  <h4 className="text-base md:text-lg font-semibold text-black mb-2">Bio</h4>
                  <p className="text-sm md:text-base text-black leading-relaxed whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </div>
              )}
              
              {profile.social_link && (
                <div>
                  <h4 className="text-base md:text-lg font-semibold text-black mb-2">Social</h4>
                  <a
                    href={profile.social_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm md:text-base text-blue-600 hover:underline break-words"
                  >
                    {profile.social_link.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              
              {profile.price_per_eval && (
                <div>
                  <h4 className="text-base md:text-lg font-semibold text-black mb-2">Price per Evaluation</h4>
                  <p className="text-sm md:text-base text-black font-medium">${profile.price_per_eval}</p>
                </div>
              )}
              
              {profile.turnaround_time && (
                <div>
                  <h4 className="text-base md:text-lg font-semibold text-black mb-2">Turnaround Time</h4>
                  <p className="text-sm md:text-base text-black font-medium">{profile.turnaround_time}</p>
                </div>
              )}
              
              {(!profile.work_history && !profile.additional_info && !profile.bio && !profile.price_per_eval && !profile.turnaround_time && !profile.social_link) && (
                <p className="text-sm md:text-base text-gray-500">No additional information available.</p>
              )}
            </div>
            
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {!isOwnProfile && profile.role === 'scout' && (
                <button
                  onClick={() => {
                    setShowMoreInfo(false)
                    handleRequestEvaluation()
                  }}
                  disabled={requesting}
                  className="interactive-press flex-1 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 font-semibold text-sm md:text-base transition-colors disabled:active:scale-100"
                >
                  {requesting ? 'Processing...' : `Purchase Evaluation - $${profile.price_per_eval || '99'}`}
                </button>
              )}
              <button
                onClick={() => setShowMoreInfo(false)}
                className={`interactive-press px-6 py-3 border border-gray-300 bg-white text-black rounded-full hover:bg-gray-50 font-medium text-sm md:text-base transition-colors ${!isOwnProfile ? 'flex-1 sm:flex-initial' : 'w-full'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How It Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowHowItWorks(false)}>
          <div className="bg-white rounded-lg p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-2xl font-bold text-black">
                How Upfront Payments Work
              </h3>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="interactive-press text-gray-500 hover:text-black text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className='space-y-6'>
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-1">Pay Upfront to Secure Your Spot</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      Tap "Request & Pay Now" to jump straight into secure Stripe checkout. Got1 charges the full amount immediately and holds it in escrow until the scout delivers. Cancel anytime before the scout confirms for an instant full refund.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-1">Scout Confirms or Declines</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      The scout reviews your paid request. <strong>If they confirm:</strong> they lock in the work and start the evaluation. <strong>If they decline:</strong> Got1 automatically refunds 100% of your payment back to your card right away.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-1">Scout Delivers</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      The scout finishes your evaluation within their turnaround time. When they submit, the payment is released from escrow—90% goes to the scout and Got1 retains a 10% platform fee. We’ll email you the finished evaluation immediately.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="surface-card-muted mt-6 p-4">
                <h4 className="font-semibold text-black mb-2">Refund Policy</h4>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>✅ Cancel before the scout confirms for an instant full refund</li>
                  <li>✅ If the scout denies your request, we automatically refund you in full</li>
                  <li>🚫 Once the scout confirms, the evaluation is locked in (reach out to support for exceptional circumstances)</li>
                  <li>💡 Your payment stays in escrow until the scout finishes the evaluation</li>
                </ul>
              </div>
            </div>
            
            <button
              onClick={() => setShowHowItWorks(false)}
              className="interactive-press w-full mt-6 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Evaluations Contributed Section */}
      <div className="mt-8 md:mt-12 mb-12 md:mb-16 relative">
        <h2 className="text-xl md:text-2xl font-bold text-black mb-6 md:mb-8">
          Evaluations Contributed ({evaluations.length})
        </h2>
        {loading ? (
          <EvaluationListSkeleton />
        ) : evaluations.length === 0 && isSignedIn ? (
          <EmptyState
            icon={emptyEvaluationIcon}
            title="No evaluations contributed yet"
            description={
              isOwnProfile
                ? 'Complete your first evaluation to see it listed here and start building trust.'
                : 'This scout has not contributed any public evaluations yet.'
            }
            action={
              isOwnProfile ? (
                <Link
                  href="/discover"
                  className="interactive-press inline-flex items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                >
                  Find players to evaluate
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7M4 12h12" />
                  </svg>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="relative animate-fade-in-up">
            <div className={`space-y-6 ${!isSignedIn ? 'filter blur-md' : ''}`}>
              {isSignedIn ? (
                evaluations.map((evaluation) => {
                  const playerAvatarUrl = isMeaningfulAvatar(evaluation.player?.avatar_url)
                    ? evaluation.player?.avatar_url ?? undefined
                    : undefined
                  const playerGradientKey =
                    evaluation.player?.user_id ||
                    evaluation.player_id ||
                    evaluation.player?.id ||
                    evaluation.player?.username ||
                    evaluation.id
                  const showPlayerAvatar =
                    Boolean(playerAvatarUrl) && !imageErrors.has(`player-${evaluation.id}`)

                  return (
                    <div key={evaluation.id} className="border-b border-gray-200 pb-4 md:pb-6 last:border-0">
                      <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                        <Link
                          href={evaluation.player?.id ? getProfilePath(evaluation.player.id, evaluation.player.username) : '#'}
                          className="interactive-press flex items-start gap-3 md:gap-4 hover:opacity-90 transition-opacity cursor-pointer flex-1"
                        >
                          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0">
                            {showPlayerAvatar ? (
                              <Image
                                src={playerAvatarUrl!}
                                alt={evaluation.player?.full_name || 'Player'}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                                onError={() => {
                                  setImageErrors((prev) => new Set(prev).add(`player-${evaluation.id}`))
                                }}
                                unoptimized
                              />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${getGradientForId(playerGradientKey)}`}>
                                <span className="text-white text-xl font-semibold">
                                  {evaluation.player?.full_name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-black text-base md:text-lg mb-1 truncate">
                              {evaluation.player?.full_name || 'Unknown Player'}
                            </h3>
                            <p className="text-black text-xs md:text-sm mb-1 truncate">
                              {evaluation.player?.school || 'Unknown School'}
                              {evaluation.player?.school && evaluation.player?.graduation_year && ', '}
                              {evaluation.player?.graduation_year && `${evaluation.player.graduation_year}`}
                            </p>
                            <p className="text-black text-xs md:text-sm text-gray-600">
                              {formatDate(evaluation.created_at)}
                            </p>
                          </div>
                        </Link>
                        {evaluation.notes && (
                          <button
                            onClick={() => toggleEvalMinimize(evaluation.id)}
                            className="interactive-press flex-shrink-0 text-gray-500 hover:text-black transition-colors p-1"
                            title={minimizedEvals.has(evaluation.id) ? 'Expand' : 'Minimize'}
                          >
                            <svg
                              className={`w-5 h-5 transition-transform ${minimizedEvals.has(evaluation.id) ? '' : 'rotate-180'}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                        {evaluation.notes && !minimizedEvals.has(evaluation.id) && (
                        <div className="pl-0 md:pl-20 mt-4 md:mt-0">
                          <p className="text-black leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                            {evaluation.notes}
                          </p>
                        </div>
                      )}
                      {/* Share button - bottom left underneath evaluation (always visible) */}
                      <div className="pl-0 md:pl-20 mt-4 md:mt-2 flex items-start">
                        <ShareButton 
                          evaluationId={evaluation.id} 
                          {...(currentUserId && { userId: currentUserId })}
                          evaluation={{
                            id: evaluation.id,
                            share_token: evaluation.share_token || null,
                            status: 'completed',
                            ...(evaluation.player_id && { player_id: evaluation.player_id }),
                            scout: profile.role === 'scout' ? {
                              full_name: profile.full_name,
                              organization: profile.organization,
                            } : null,
                          }}
                        />
                      </div>
                    </div>
                  )
                })
              ) : (
                // Placeholder evaluations for non-signed-in users
                [...Array(3)].map((_, index) => (
                  <div key={index} className="border-b border-gray-200 pb-4 md:pb-6 last:border-0">
                    <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-300 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="h-5 bg-gray-300 rounded mb-2 w-3/4"></div>
                        <div className="h-4 bg-gray-300 rounded mb-1 w-1/2"></div>
                        <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                      </div>
                    </div>
                    <div className="pl-0 md:pl-20 mt-4 md:mt-0">
                      <div className="h-4 bg-gray-300 rounded mb-2 w-full"></div>
                      <div className="h-4 bg-gray-300 rounded mb-2 w-full"></div>
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Sign in/Sign up overlay for non-signed-in users */}
            {!isSignedIn && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-40 backdrop-blur-[2px]">
                <div className="bg-white rounded-lg shadow-xl border border-gray-300 p-6 md:p-8 max-w-md mx-4 text-center">
                  <h3 className="text-xl md:text-2xl font-bold text-black mb-3">
                    Sign in to view evaluations
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create an account or sign in to see detailed evaluations
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/auth/signup"
                      className="interactive-press flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
                    >
                      Sign Up
                    </Link>
                    <Link
                      href="/auth/signin"
                      className="interactive-press flex-1 px-6 py-3 bg-gray-100 text-black rounded-lg hover:bg-gray-200 font-medium transition-colors"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Profile Modal */}
      <Modal 
        isOpen={showReportModal} 
        onClose={() => {
          setShowReportModal(false)
          setReportReason('')
          setIsSubmittingReport(false)
          setReportSuccess(false)
        }} 
        title="Report Profile"
      >
        {reportSuccess ? (
          <div className="space-y-4">
            <p className="text-black leading-relaxed">
              Thanks for letting us know. Our team will review this profile and take the appropriate action.
            </p>
            <button
              onClick={() => {
                setShowReportModal(false)
                setReportSuccess(false)
                setReportReason('')
              }}
              className="interactive-press w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-black leading-relaxed">
              You are reporting <strong>{profile.full_name || 'this profile'}</strong>{profile.role ? ` (${profile.role})` : ''}. This sends a message to the Got1 team to review their activity.
            </p>
            <div className="space-y-2">
              <label htmlFor="report-reason" className="text-sm font-semibold text-black">Reason (optional)</label>
              <textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Share any details that can help our team review this profile..."
                className="w-full min-h-[120px] border border-gray-300 rounded-lg p-3 text-black focus:outline-none focus:ring-2 focus:ring-black"
                maxLength={2000}
              />
              <p className="text-xs text-gray-500">Usernames and links are helpful if you have them.</p>
            </div>
            <button
              onClick={async () => {
                try {
                  setIsSubmittingReport(true)
                  const response = await fetch('/api/report/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profileId: profile.id, reason: reportReason }),
                  })

                  if (!response.ok) {
                    const data = await response.json().catch(() => ({}))
                    throw new Error(data.error || 'Failed to submit report. Please try again.')
                  }

                  setReportSuccess(true)
                } catch (error: any) {
                  alert(error.message || 'Failed to submit report. Please try again.')
                } finally {
                  setIsSubmittingReport(false)
                }
              }}
              disabled={isSubmittingReport}
              className="interactive-press w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors disabled:opacity-60 disabled:active:scale-100"
            >
              {isSubmittingReport ? 'Sending...' : 'Send Report'}
            </button>
          </div>
        )}
      </Modal>

      {/* Sign Up Modal for non-authenticated users */}
      <AuthModal
        isOpen={showSignUpModal}
        onClose={() => {
          setShowSignUpModal(false)
          setAuthMode('signup')
        }}
        mode={authMode}
        onModeChange={(newMode) => {
          setAuthMode(newMode)
        }}
      />
    </div>
  )
}