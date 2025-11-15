'use client'

// Status comparison fix: Using === for proper type checking
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import Image from 'next/image'
import VerificationBadge from '@/components/shared/VerificationBadge'
import HeaderMenu from '@/components/shared/HeaderMenu'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'
import ShareButton from '@/components/evaluations/ShareButton'

interface MyEvalsContentProps {
  role: 'player' | 'scout'
  userId: string
}

interface Evaluation {
  id: string
  scout_id: string
  player_id: string
  status: 'requested' | 'confirmed' | 'denied' | 'in_progress' | 'completed'
  price: number
  scout_payout?: number | null
  completed_at?: string | null
  created_at: string
  share_token?: string | null
  scout?: {
    full_name: string | null
    avatar_url: string | null
    organization: string | null
    position: string | null
  } | null
  player?: {
    full_name: string | null
    avatar_url: string | null
    school: string | null
    graduation_year: number | null
  } | null
}

/**
 * Component for displaying evaluations for the current user.
 * Shows different tabs for in-progress and completed evaluations.
 * 
 * @param role - The user's role ('player' or 'scout')
 * @param userId - The user's ID from auth.users
 */
export default function MyEvalsContent({ role, userId }: MyEvalsContentProps) {
  const [activeTab, setActiveTab] = useState<'in_progress' | 'completed'>('in_progress')
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [playerImageErrors, setPlayerImageErrors] = useState<Set<string>>(new Set())
  const [scoutImageErrors, setScoutImageErrors] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const supabase = createClient()


  /**
   * Loads evaluations and manually joins profile data.
   * Since evaluations reference auth.users, we need to manually join with profiles.
   */
  const loadEvaluations = useCallback(async () => {
    try {
      setLoading(true)
      
      // First, get the evaluations (including share_token for sharing if column exists)
      let evaluationsData: any[] | null = null
      let evaluationsError
      
      try {
        // Try with share_token first
        let query = supabase
          .from('evaluations')
          .select('id, status, price, scout_payout, completed_at, notes, created_at, scout_id, player_id, share_token')

        if (role === 'scout') {
          query = query.eq('scout_id', userId)
        } else {
          query = query.eq('player_id', userId)
        }

        // Filter by status
        if (activeTab === 'in_progress') {
          // Include all non-completed statuses: requested, confirmed, in_progress
          query = query.in('status', ['requested', 'confirmed', 'in_progress'])
        } else {
          query = query.eq('status', 'completed')
        }

        query = query.order('created_at', { ascending: false })

        console.log('🔍 Loading evaluations with filters:', {
          role,
          userId,
          activeTab,
          statusFilter: activeTab === 'in_progress' ? ['requested', 'confirmed', 'in_progress'] : ['completed'],
        })

        const result = await query
        evaluationsData = result.data
        evaluationsError = result.error

        console.log('📦 Evaluation query result:', {
          count: evaluationsData?.length || 0,
          evaluations: evaluationsData?.map(e => ({
            id: e.id,
            status: e.status,
            scout_id: e.scout_id,
            player_id: e.player_id,
            created_at: e.created_at,
          })),
          error: evaluationsError,
        })

        // If error is due to share_token column not existing, try without it
        if (evaluationsError && (evaluationsError.code === '42703' || evaluationsError.message?.includes('column "share_token" does not exist'))) {
          console.warn('share_token column not found, fetching without it')
          let queryWithoutToken = supabase
            .from('evaluations')
            .select('id, status, price, scout_payout, completed_at, notes, created_at, scout_id, player_id')

          if (role === 'scout') {
            queryWithoutToken = queryWithoutToken.eq('scout_id', userId)
          } else {
            queryWithoutToken = queryWithoutToken.eq('player_id', userId)
          }

          // Filter by status
          if (activeTab === 'in_progress') {
            queryWithoutToken = queryWithoutToken.in('status', ['requested', 'confirmed', 'in_progress'])
          } else {
            queryWithoutToken = queryWithoutToken.eq('status', 'completed')
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
        console.error('Error loading evaluations:', evaluationsError)
        console.error('Error details:', JSON.stringify(evaluationsError, null, 2))
        console.error('Error code:', evaluationsError.code)
        console.error('Error message:', evaluationsError.message)
        throw evaluationsError
      }
      
      console.log('✅ Loaded evaluations from database:', {
        count: evaluationsData?.length || 0,
        evaluations: evaluationsData?.map(e => ({
          id: e.id,
          status: e.status,
          scout_id: e.scout_id,
          player_id: e.player_id,
        })),
      })

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
        .select('user_id, full_name, avatar_url, organization, school, graduation_year, position')
        .in('user_id', Array.from(userIds))

      if (profilesError) throw profilesError

      // Manually join evaluations with profiles
      const evaluationsWithProfiles = evaluationsData.map((evaluation) => {
        const scoutProfile = profilesData?.find((p) => p.user_id === evaluation.scout_id) || null
        const playerProfile = profilesData?.find((p) => p.user_id === evaluation.player_id) || null

        return {
          id: evaluation.id,
          scout_id: evaluation.scout_id,
          player_id: evaluation.player_id,
          status: evaluation.status,
          price: evaluation.price,
          scout_payout: evaluation.scout_payout,
          completed_at: evaluation.completed_at,
          notes: evaluation.notes,
          created_at: evaluation.created_at,
          scout: scoutProfile ? {
            full_name: scoutProfile.full_name,
            avatar_url: scoutProfile.avatar_url,
            organization: scoutProfile.organization,
            position: scoutProfile.position,
          } : null,
          player: playerProfile ? {
            full_name: playerProfile.full_name,
            avatar_url: playerProfile.avatar_url,
            school: playerProfile.school,
            graduation_year: playerProfile.graduation_year,
          } : null,
        }
      })

      setEvaluations(evaluationsWithProfiles)
    } catch (error: any) {
      console.error('Error loading evaluations:', error)
      console.error('Error message:', error?.message)
      console.error('Error details:', JSON.stringify(error, null, 2))
      setEvaluations([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, role, userId, refreshKey, supabase])

  useEffect(() => {
    loadEvaluations()
  }, [loadEvaluations])

  // Subscribe to real-time changes for evaluations
  useEffect(() => {
    if (!userId) return

    console.log('🔔 Setting up real-time subscription for evaluations...', {
      userId,
      role,
      filter: role === 'scout' ? `scout_id=eq.${userId}` : `player_id=eq.${userId}`,
    })

    const channel = supabase
      .channel(`evaluations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'evaluations',
          filter: role === 'scout' 
            ? `scout_id=eq.${userId}` 
            : `player_id=eq.${userId}`,
        },
        (payload: any) => {
          console.log('🔄 Real-time evaluation change detected:', {
            eventType: payload.eventType,
            evaluationId: (payload.new as any)?.id || (payload.old as any)?.id,
            status: (payload.new as any)?.status || (payload.old as any)?.status,
            player_id: (payload.new as any)?.player_id || (payload.old as any)?.player_id,
            scout_id: (payload.new as any)?.scout_id || (payload.old as any)?.scout_id,
          })
          // Force reload evaluations when any change happens
          loadEvaluations()
        }
      )
      .subscribe((status) => {
        console.log('🔔 Real-time subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active for evaluations')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error - channel error')
        } else if (status === 'TIMED_OUT') {
          console.error('❌ Real-time subscription error - timed out')
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Real-time subscription closed')
        }
      })

    return () => {
      console.log('🔕 Unsubscribing from real-time channel')
      channel.unsubscribe()
    }
  }, [userId, role, loadEvaluations, supabase])


  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-4 md:mb-6">
        <div className="flex gap-2 md:gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`interactive-press px-3 md:px-4 py-2 font-medium text-sm md:text-base transition-colors ${
              activeTab === 'in_progress'
                ? 'bg-gray-100 border-b-2 border-black text-black'
                : 'text-black hover:bg-gray-50'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`interactive-press px-3 md:px-4 py-2 font-medium text-sm md:text-base transition-colors ${
              activeTab === 'completed'
                ? 'bg-gray-100 border-b-2 border-black text-black'
                : 'text-black hover:bg-gray-50'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 animate-fade-in">Loading...</div>
      ) : (
        <div key={activeTab} className="animate-fade-in-up">
          {evaluations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No {activeTab === 'in_progress' ? 'in progress' : 'completed'} evaluations yet.
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
          {evaluations.map((evaluation) => {
            const payoutAmount =
              evaluation.scout_payout ??
              Math.round(((evaluation.price ?? 0) * 0.9 + Number.EPSILON) * 100) / 100
            const roundedPayout = Math.round(payoutAmount)
            const completionDate =
              activeTab === 'completed' && evaluation.completed_at
                ? new Date(evaluation.completed_at)
                : null

            return (
              <div
                key={evaluation.id}
                className="flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Link
                  href={`/evaluations/${evaluation.id}`}
                  className="interactive-press flex items-center gap-3 md:gap-4 flex-1 min-w-0"
                >
                  {role === 'scout' ? (
                  // Scout view: Show player being evaluated
                  <>
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0">
                      {(() => {
                        const avatarUrl = isMeaningfulAvatar(evaluation.player?.avatar_url)
                          ? evaluation.player?.avatar_url ?? undefined
                          : undefined
                        const showAvatar = Boolean(avatarUrl) && !playerImageErrors.has(evaluation.id)

                        if (showAvatar) {
                          return (
                            <Image
                              src={avatarUrl!}
                              alt={evaluation.player?.full_name || 'Player'}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                              onError={() => {
                                setPlayerImageErrors((prev) => {
                                  const next = new Set(prev)
                                  next.add(evaluation.id)
                                  return next
                                })
                              }}
                              unoptimized
                            />
                          )
                        }

                        return (
                          <div
                            className={`w-full h-full flex items-center justify-center text-xl font-semibold text-white ${getGradientForId(evaluation.player_id || evaluation.id)}`}
                          >
                            {evaluation.player?.full_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-black text-base md:text-lg mb-1 truncate">
                        {evaluation.player?.full_name || 'Unknown Player'}
                      </h3>
                      <p className="text-black text-xs md:text-sm truncate">
                        {evaluation.player?.school || 'Unknown School'}
                        {evaluation.player?.school && evaluation.player?.graduation_year && ', '}
                        {evaluation.player?.graduation_year && `${evaluation.player.graduation_year}`}
                      </p>
                      {/* Status badge */}
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                        <span className={`inline-block px-2 py-0.5 font-medium rounded ${
                          evaluation.status === 'requested' ? 'bg-blue-100 text-blue-800' :
                          evaluation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          evaluation.status === 'denied' ? 'bg-red-100 text-red-800' :
                          evaluation.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          evaluation.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {evaluation.status === 'requested' ? 'Requested' :
                           evaluation.status === 'confirmed' ? 'Confirmed' :
                           evaluation.status === 'denied' ? 'Denied' :
                           evaluation.status === 'in_progress' ? 'In Progress' :
                           evaluation.status === 'completed' ? 'Completed' :
                           evaluation.status}
                        </span>
                        {completionDate && (
                          <span>
                            {completionDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                  ) : (
                  // Player view: Show scout evaluating them
                  <>
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0">
                      {(() => {
                        const avatarUrl = isMeaningfulAvatar(evaluation.scout?.avatar_url)
                          ? evaluation.scout?.avatar_url ?? undefined
                          : undefined
                        const showAvatar = Boolean(avatarUrl) && !scoutImageErrors.has(evaluation.id)

                        if (showAvatar) {
                          return (
                            <Image
                              src={avatarUrl!}
                              alt={evaluation.scout?.full_name || 'Scout'}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                              onError={() => {
                                setScoutImageErrors((prev) => {
                                  const next = new Set(prev)
                                  next.add(evaluation.id)
                                  return next
                                })
                              }}
                              unoptimized
                            />
                          )
                        }

                        return (
                          <div
                            className={`w-full h-full flex items-center justify-center text-xl font-semibold text-white ${getGradientForId(evaluation.scout_id || evaluation.id)}`}
                          >
                            {evaluation.scout?.full_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-black text-base md:text-lg mb-1 truncate">
                        {evaluation.scout?.full_name || 'Unknown Scout'}
                      </h3>
                      <p className="text-black text-xs md:text-sm truncate">
                        {evaluation.scout?.organization || 'Unknown Organization'}
                      </p>
                      {/* Status badge */}
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                        <span className={`inline-block px-2 py-0.5 font-medium rounded ${
                          evaluation.status === 'requested' ? 'bg-blue-100 text-blue-800' :
                          evaluation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          evaluation.status === 'denied' ? 'bg-red-100 text-red-800' :
                          evaluation.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          evaluation.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {evaluation.status === 'requested' ? 'Requested' :
                           evaluation.status === 'confirmed' ? 'Confirmed' :
                           evaluation.status === 'denied' ? 'Denied' :
                           evaluation.status === 'in_progress' ? 'In Progress' :
                           evaluation.status === 'completed' ? 'Completed' :
                           evaluation.status}
                        </span>
                        {completionDate && (
                          <span>
                            {completionDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                  )}
                </Link>
                {/* Share button - visible for all evaluations */}
                <div className="flex-shrink-0">
                  <ShareButton 
                    evaluationId={evaluation.id} 
                    evaluation={{
                      id: evaluation.id,
                      share_token: evaluation.share_token || null,
                      status: evaluation.status,
                      scout: evaluation.scout,
                    }}
                  />
                </div>
              </div>
            )})}
            </div>
          )}
        </div>
      )}
    </div>
  )
}