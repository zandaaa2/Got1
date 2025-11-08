'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import VerificationBadge from '@/components/shared/VerificationBadge'
import HeaderMenu from '@/components/shared/HeaderMenu'

interface ProfileViewProps {
  profile: any
  isOwnProfile: boolean
}

interface Evaluation {
  id: string
  notes: string | null
  created_at: string
  scout?: {
    id: string
    full_name: string | null
    avatar_url: string | null
    organization: string | null
  } | null
  player?: {
    id: string
    full_name: string | null
    avatar_url: string | null
    school: string | null
    graduation_year: number | null
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
  const router = useRouter()
  const supabase = createClient()
  
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
        .select('id, user_id, full_name, avatar_url, organization, school, graduation_year')
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
          scout: scoutProfile ? {
            id: scoutProfile.id,
            full_name: scoutProfile.full_name,
            avatar_url: scoutProfile.avatar_url,
            organization: scoutProfile.organization,
          } : null,
          player: playerProfile ? {
            id: playerProfile.id,
            full_name: playerProfile.full_name,
            avatar_url: playerProfile.avatar_url,
            school: playerProfile.school,
            graduation_year: playerProfile.graduation_year,
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
        <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mx-auto md:mx-0">
            {profile.avatar_url && !imageErrors.has(`profile-${profile.id}`) ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name || 'Player'}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                onError={() => {
                  setImageErrors((prev) => new Set(prev).add(`profile-${profile.id}`))
                }}
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 text-3xl font-semibold">
                  {profile.full_name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 w-full text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 flex items-center justify-center md:justify-start gap-2">
              {profile.full_name || 'Unknown Player'}
              {isTestAccount(profile.full_name) && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded">
                  test account
                </span>
              )}
            </h1>
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
                className="text-blue-600 hover:underline mb-2 block text-center md:text-left"
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
        </div>

        {/* Evaluations Section */}
        <div className="mb-6 md:mb-8 relative">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-6">
            Evaluations ({evaluations.length})
          </h2>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : evaluations.length === 0 && isSignedIn ? (
            <div className="text-center py-12 text-gray-500">
              No evaluations yet.
            </div>
          ) : (
            <div className="relative">
              <div className={`space-y-6 ${!isSignedIn ? 'filter blur-md' : ''}`}>
                {isSignedIn ? evaluations.map((evaluation) => (
                <div key={evaluation.id} className="border-b border-gray-200 pb-4 md:pb-6 last:border-0">
                  <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                    <Link 
                      href={evaluation.scout?.id ? `/profile/${evaluation.scout.id}` : '#'}
                      className="flex items-start gap-3 md:gap-4 hover:opacity-90 transition-opacity cursor-pointer flex-1"
                    >
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        {evaluation.scout?.avatar_url && !imageErrors.has(`scout-${evaluation.id}`) ? (
                          <Image
                            src={evaluation.scout.avatar_url}
                            alt={evaluation.scout.full_name || 'Scout'}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                            onError={() => {
                              setImageErrors((prev) => new Set(prev).add(`scout-${evaluation.id}`))
                            }}
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 text-xl font-semibold">
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
              )) : (
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
      <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="flex flex-col items-center md:items-start gap-2 flex-shrink-0 mx-auto md:mx-0">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-200 overflow-hidden">
            {profile.avatar_url && !imageErrors.has(`profile-${profile.id}`) ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name || 'Scout'}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                onError={() => {
                  setImageErrors((prev) => new Set(prev).add(`profile-${profile.id}`))
                }}
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 text-3xl font-semibold">
                  {profile.full_name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
          {profile.role === 'scout' && (
            <span className="md:hidden px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded inline-flex items-center gap-1.5">
              <VerificationBadge className="w-3.5 h-3.5" />
              Scout
            </span>
          )}
        </div>
        <div className="flex-1 w-full text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-black flex items-center gap-2 text-center md:text-left">
              {profile.full_name || 'Unknown Scout'}
            </h1>
            <span className="hidden md:inline-flex px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded items-center gap-1.5">
              <VerificationBadge className="w-3.5 h-3.5" />
              Scout
            </span>
            {isTestAccount(profile.full_name) && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded">
                test account
              </span>
            )}
          </div>
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
          <div className="flex justify-center md:justify-start">
            {!isOwnProfile && (
              <button
                onClick={() => setShowMoreInfo(true)}
                className="text-sm text-blue-600 hover:text-blue-800 underline font-medium mx-auto md:mx-0"
              >
                Details
              </button>
            )}
          </div>
        </div>
                {!isOwnProfile && profile.role === 'scout' && currentUserId && (
                  <div className="flex-shrink-0">
                    <HeaderMenu 
                      userId={currentUserId} 
                      scoutId={profile.user_id}
                      onCancelled={() => {
                        router.refresh()
                        // Also reload evaluations to update the UI
                        loadEvaluations()
                      }}
                    />
                  </div>
                )}
      </div>

      {/* Pricing & Purchase Section - Show for all scout profiles */}
      <div className="mb-6 md:mb-8 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Price and Turnaround */}
          <div className="flex items-center justify-between md:justify-start gap-6 w-full md:w-auto">
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
          
          {/* Action buttons */}
          <div className="flex flex-col items-center gap-2 w-full md:w-auto">
            {!isOwnProfile ? (
              <>
                <button
                  onClick={handleRequestEvaluation}
                  disabled={requesting}
                  className="w-full max-w-xs px-8 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 font-semibold text-sm transition-colors text-center shadow-sm"
                >
                  {requesting ? 'Processing...' : 'Request Evaluation'}
                </button>
                <button
                  onClick={() => setShowHowItWorks(true)}
                  className="text-sm text-gray-600 hover:text-black underline font-medium"
                >
                  How this works
                </button>
              </>
            ) : (
              <div className="w-full max-w-xs px-6 py-2 bg-gray-100 text-gray-500 rounded-full font-medium text-sm text-center cursor-not-allowed">
                Your Profile
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Button - Only for own profile */}
      {isOwnProfile && (
        <div className="mb-6 md:mb-8">
          <a
            href="/profile/edit"
            className="block w-full px-4 md:px-6 py-2.5 md:py-3 border border-black text-black rounded-lg hover:bg-gray-50 text-center font-medium text-sm md:text-base"
          >
            Edit Profile
          </a>
        </div>
      )}

      {/* More Info Modal */}
      {showMoreInfo && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={() => setShowMoreInfo(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-2xl font-bold text-black">
                More Information
              </h3>
              <button
                onClick={() => setShowMoreInfo(false)}
                className="text-gray-500 hover:text-black text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
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
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-lg transition-colors"
                >
                  {requesting ? 'Processing...' : `Purchase Evaluation - $${profile.price_per_eval || '99'}`}
                </button>
              )}
              <button
                onClick={() => setShowMoreInfo(false)}
                className={`px-6 py-3 border border-gray-300 text-black rounded-lg hover:bg-gray-50 font-medium ${!isOwnProfile ? '' : 'w-full'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How It Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowHowItWorks(false)}>
          <div className="bg-white rounded-lg p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-2xl font-bold text-black">
                How Evaluations Work
              </h3>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="text-gray-500 hover:text-black text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-1">Pay Upfront to Secure Your Spot</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      Tap "Request Evaluation" to go straight to our secure Stripe checkout. The full amount is charged immediately and held in Got1 escrow until the scout delivers. You can still cancel for a full refund anytime before the scout confirms.
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
                    <h4 className="font-semibold text-black mb-1">Scout Confirms</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      The scout reviews your paid request. <strong>If confirmed:</strong> they lock in the job and begin the evaluation. <strong>If denied:</strong> we automatically issue a full refund to your card immediately.
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
                      The scout completes your evaluation within their turnaround time. Once submitted, the scout receives 90% of the payment and Got1 retains a 10% platform fee. You'll receive the finished evaluation by email.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
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
              className="w-full mt-6 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-medium"
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
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : evaluations.length === 0 && isSignedIn ? (
          <div className="text-center py-12 text-gray-500">
            No evaluations contributed yet.
          </div>
        ) : (
          <div className="relative">
            <div className={`space-y-6 ${!isSignedIn ? 'filter blur-md' : ''}`}>
              {isSignedIn ? evaluations.map((evaluation) => (
              <div key={evaluation.id} className="border-b border-gray-200 pb-4 md:pb-6 last:border-0">
                <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                  <Link 
                    href={evaluation.player?.id ? `/profile/${evaluation.player.id}` : '#'}
                    className="flex items-start gap-3 md:gap-4 hover:opacity-90 transition-opacity cursor-pointer flex-1"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {evaluation.player?.avatar_url && !imageErrors.has(`player-${evaluation.id}`) ? (
                        <Image
                          src={evaluation.player.avatar_url}
                          alt={evaluation.player.full_name || 'Player'}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                          onError={() => {
                            setImageErrors((prev) => new Set(prev).add(`player-${evaluation.id}`))
                          }}
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 text-xl font-semibold">
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
            )) : (
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
    </div>
  )
}

