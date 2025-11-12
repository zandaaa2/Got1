'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import VerificationBadge from '@/components/shared/VerificationBadge'
import HeaderMenu from '@/components/shared/HeaderMenu'
import ReportProfileMenu from '@/components/profile/ReportProfileMenu'
import { getProfilePath } from '@/lib/profile-url'
import { EmptyState } from '@/components/shared/EmptyState'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'


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

interface ProfileViewProps {
  profile: any
  isOwnProfile: boolean
}

interface Evaluation {
  id: string
  notes: string | null
  created_at: string
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

export default function ProfileView({ profile, isOwnProfile }: ProfileViewProps) {
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

  const copyButtonLabel =
    copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Try again' : 'Copy'

  const profileLinkElement = (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <a
        href={fullProfileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-blue-600 hover:underline break-all"
      >
        {displayProfileUrl}
      </a>
      <button
        type="button"
        onClick={handleCopyProfileUrl}
        className="interactive-press inline-flex items-center gap-1 rounded-full border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        aria-live="polite"
        aria-label="Copy profile link"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 13a3 3 0 010-6h2" />
          <path d="M11 7a3 3 0 010 6H9" />
          <rect x="4" y="4" width="12" height="12" rx="3" />
        </svg>
        <span>{copyButtonLabel}</span>
      </button>
    </div>
  )
  
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

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setCurrentUserId(session.user.id)
        setIsSignedIn(true)
      } else {
        setIsSignedIn(false)
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
      
      // First, get the evaluations
      let query = supabase
        .from('evaluations')
        .select('id, notes, created_at, scout_id, player_id')

      if (profile.role === 'player') {
        // Get evaluations received by this player
        query = query.eq('player_id', profile.user_id).eq('status', 'completed')
      } else {
        // Get evaluations contributed by this scout
        query = query.eq('scout_id', profile.user_id).eq('status', 'completed')
      }

      query = query.order('created_at', { ascending: false })

      const { data: evaluationsData, error: evaluationsError } = await query

      if (evaluationsError) throw evaluationsError

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
   * Redirects to the purchase page.
   */
  const handleRequestEvaluation = async () => {
    if (!profile || profile.role !== 'scout') return

    setRequesting(true)
    router.push(`/profile/${profile.id}/purchase`)
    setRequesting(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    })
  }

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
        <button
          onClick={() => router.back()}
          className="mb-4 md:mb-6 flex items-center gap-2 text-black hover:opacity-70 text-sm md:text-base"
        >
          <svg
            className="w-5 h-5 md:w-6 md:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="md:hidden">Back</span>
        </button>

        {/* Player Profile Section */}
        <div className="flex flex-row flex-wrap md:flex-nowrap items-start gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="flex flex-col items-start gap-2 flex-shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden">
              {profileAvatarUrl && !imageErrors.has(`profile-${profile.id}`) ? (
                <Image
                  src={profileAvatarUrl}
                  alt={profile.full_name || 'Player'}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  onError={() => {
                    setImageErrors((prev) => new Set(prev).add(`profile-${profile.id}`))
                  }}
                  priority
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${getGradientForId(profileGradientKey)}`}>
                  <span className="text-white text-3xl font-semibold">
                    {profile.full_name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 w-full text-left">
            <div className="flex flex-wrap items-center gap-1 mb-1">
              <h1 className="text-xl md:text-2xl font-bold text-black break-words">
                {profile.full_name || 'Unknown Player'}
              </h1>
              {isTestAccount(profile.full_name) && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded flex-shrink-0 whitespace-nowrap">
                  test account
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-1">
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
            {profileLinkElement}
            {(profile.position || profile.school) && (
              <p className="text-black mb-2">
                {profile.position && profile.school
                  ? `${profile.position} at ${profile.school}`
                  : profile.position
                  ? profile.position
                  : profile.school
                  ? profile.school
                  : ''}
                {profile.school && profile.graduation_year && ` (${profile.graduation_year})`}
              </p>
            )}
            {profile.hudl_link && (
              <a
                href={profile.hudl_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline mb-2 block"
              >
                {profile.hudl_link.replace(/^https?:\/\//, '')}
              </a>
            )}
            {profile.bio && (
              <p className="text-black mt-4 leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}
          </div>
          {!isOwnProfile && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <ReportProfileMenu
                reportedProfileId={profile.id}
                reportedName={profile.full_name}
                reportedRole={profile.role}
                isSignedIn={isSignedIn}
              />
            </div>
          )}
        </div>

        {/* Evaluations Section */}
        <div className="mb-6 md:mb-8 relative">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-6">
            Evaluations ({evaluations.length})
          </h2>
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
                    href="/browse?tab=profiles"
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
                            <h3 className="font-bold text-black text-base md:text-lg mb-1 truncate">
                              {evaluation.scout?.full_name || 'Unknown Scout'}
                            </h3>
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

        {/* More Info Modal */}
        {showMoreInfo && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" 
            onClick={() => setShowMoreInfo(false)}
          >
            <div 
              className="bg-white rounded-lg p-6 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-scale-in" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-2xl font-bold text-black">
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
              
              <div className='space-y-6'>
                {profile.bio && (
                  <div>
                    <h4 className="text-lg font-semibold text-black mb-2">Bio</h4>
                    <p className="text-black leading-relaxed whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  </div>
                )}
                
                {profile.hudl_link && (
                  <div>
                    <h4 className="text-lg font-semibold text-black mb-2">Hudl Profile</h4>
                    <a
                      href={profile.hudl_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-words"
                    >
                      {profile.hudl_link.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                
                {profile.social_link && (
                  <div>
                    <h4 className="text-lg font-semibold text-black mb-2">Social</h4>
                    <a
                      href={profile.social_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-words"
                    >
                      {profile.social_link.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                
                {(!profile.bio && !profile.hudl_link && !profile.social_link) && (
                  <p className="text-gray-500">No additional information available.</p>
                )}
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => setShowMoreInfo(false)}
                  className="interactive-press w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900 font-medium transition-colors"
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
  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => router.back()}
        className="mb-4 md:mb-6 flex items-center gap-2 text-black hover:opacity-70 text-sm md:text-base"
      >
        <svg
          className="w-5 h-5 md:w-6 md:h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="md:hidden">Back</span>
      </button>

      {/* Scout Profile Section */}
      <div className="flex flex-row flex-wrap md:flex-nowrap items-start gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="flex flex-col items-center md:items-start gap-2 flex-shrink-0 mx-auto md:mx-0">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden">
            {profileAvatarUrl && !imageErrors.has(`profile-${profile.id}`) ? (
              <Image
                src={profileAvatarUrl}
                alt={profile.full_name || 'Scout'}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                onError={() => {
                  setImageErrors((prev) => new Set(prev).add(`profile-${profile.id}`))
                }}
                priority
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${getGradientForId(profileGradientKey)}`}>
                <span className="text-white text-3xl font-semibold">
                  {profile.full_name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 w-full text-left">
          <div className="flex flex-wrap items-center gap-1 mb-1">
            <h1 className="text-xl md:text-2xl font-bold text-black break-words">
              {profile.full_name || 'Unknown Scout'}
            </h1>
            {profile.role === 'scout' && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 flex-shrink-0 whitespace-nowrap">
                <VerificationBadge className="w-3.5 h-3.5" />
                Scout
              </span>
            )}
            {isTestAccount(profile.full_name) && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded flex-shrink-0 whitespace-nowrap">
                test account
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-1">
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
          {profileLinkElement}
          {(profile.position || profile.organization) && (
            <p className="text-black mb-2">
              {profile.position && profile.organization
                ? `${profile.position} at ${profile.organization}`
                : profile.position
                ? profile.position
                : profile.organization
                ? profile.organization
                : ''}
            </p>
          )}
        </div>
        {!isOwnProfile && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <ReportProfileMenu
              reportedProfileId={profile.id}
              reportedName={profile.full_name}
              reportedRole={profile.role}
              isSignedIn={isSignedIn}
            />
            {profile.role === 'scout' && currentUserId && (
              <HeaderMenu
                userId={currentUserId}
                scoutId={profile.user_id}
                onCancelled={() => {
                  router.refresh()
                  loadEvaluations()
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Pricing & Purchase Section - Show for all scout profiles */}
      <div className="surface-card mb-6 md:mb-8 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 md:gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Price</p>
              <p className="text-lg font-bold text-blue-600">${profile.price_per_eval || '99'}</p>
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Turnaround</p>
              <p className="text-lg font-bold text-black">{profile.turnaround_time || '72 hrs'}</p>
            </div>
          </div>
          {isOwnProfile ? (
            <div className="ml-auto w-full max-w-xs px-6 py-2 bg-gray-100 text-gray-500 rounded-full font-medium text-sm text-center cursor-not-allowed">
              Your Profile
            </div>
          ) : (
            <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-3 md:gap-4 sm:w-auto">
              <button
                onClick={() => setShowHowItWorks(true)}
                className="interactive-press hidden text-sm font-medium text-gray-600 underline hover:text-black md:inline"
              >
                Read payment flow
              </button>
              <button
                onClick={() => setShowHowItWorks(true)}
                className="interactive-press flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:text-black md:hidden"
                aria-label="Read payment flow"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-3h-1m1-4h.01M21 12a9 9 0 11-18 0 9 0 0118 0z"
                  />
                </svg>
              </button>
              <button
                onClick={handleRequestEvaluation}
                disabled={requesting}
                className="interactive-press w-full sm:w-auto px-8 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 font-semibold text-sm transition-colors text-center shadow-sm disabled:active:scale-100"
              >
                {requesting ? 'Processing...' : 'Request & Pay Now'}
              </button>
            </div>
          )}
        </div>
      </div>

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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" 
          onClick={() => setShowMoreInfo(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-scale-in" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-2xl font-bold text-black">
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
            
            <div className='space-y-6'>
              {profile.work_history && (
                <div>
                  <h4 className="text-lg font-semibold text-black mb-2">Work History</h4>
                  <p className="text-black leading-relaxed whitespace-pre-wrap">
                    {profile.work_history}
                  </p>
                </div>
              )}
              
              {profile.additional_info && (
                <div>
                  <h4 className="text-lg font-semibold text-black mb-2">Additional Information</h4>
                  <p className="text-black leading-relaxed whitespace-pre-wrap">
                    {profile.additional_info}
                  </p>
                </div>
              )}
              
              {profile.bio && (
                <div>
                  <h4 className="text-lg font-semibold text-black mb-2">Bio</h4>
                  <p className="text-black leading-relaxed whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </div>
              )}
              
              {profile.social_link && (
                <div>
                  <h4 className="text-lg font-semibold text-black mb-2">Social</h4>
                  <a
                    href={profile.social_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-words"
                  >
                    {profile.social_link.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              
              {profile.price_per_eval && (
                <div>
                  <h4 className="text-lg font-semibold text-black mb-2">Price per Evaluation</h4>
                  <p className="text-black">${profile.price_per_eval}</p>
                </div>
              )}
              
              {profile.turnaround_time && (
                <div>
                  <h4 className="text-lg font-semibold text-black mb-2">Turnaround Time</h4>
                  <p className="text-black">{profile.turnaround_time}</p>
                </div>
              )}
              
              {(!profile.work_history && !profile.additional_info && !profile.bio && !profile.price_per_eval && !profile.turnaround_time && !profile.social_link) && (
                <p className="text-gray-500">No additional information available.</p>
              )}
            </div>
            
            <div className="mt-6 flex gap-3">
              {!isOwnProfile && (
                <button
                  onClick={() => {
                    setShowMoreInfo(false)
                    handleRequestEvaluation()
                  }}
                  disabled={requesting}
                  className="interactive-press flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-lg transition-colors disabled:active:scale-100"
                >
                  {requesting ? 'Processing...' : `Purchase Evaluation - $${profile.price_per_eval || '99'}`}
                </button>
              )}
              <button
                onClick={() => setShowMoreInfo(false)}
                className={`interactive-press px-6 py-3 border border-gray-300 text-black rounded-lg hover:bg-gray-50 font-medium ${!isOwnProfile ? '' : 'w-full'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How It Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowHowItWorks(false)}>
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
      <div className="mb-6 md:mb-8 relative">
        <h2 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-6">
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
                  href="/browse?tab=profiles"
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
    </div>
  )
}