'use client'

// Status comparison fix: Using === for proper type checking
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import Image from 'next/image'
import VerificationBadge from '@/components/shared/VerificationBadge'
import HeaderMenu from '@/components/shared/HeaderMenu'

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
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const supabase = createClient()

  /**
   * Loads evaluations and manually joins profile data.
   * Since evaluations reference auth.users, we need to manually join with profiles.
   */
  const loadEvaluations = async () => {
    try {
      setLoading(true)
      
      // First, get the evaluations
      let query = supabase
        .from('evaluations')
        .select('id, status, price, scout_payout, completed_at, notes, created_at, scout_id, player_id')

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

      const { data: evaluationsData, error: evaluationsError } = await query

      if (evaluationsError) {
        console.error('Error loading evaluations:', evaluationsError)
        console.error('Error details:', JSON.stringify(evaluationsError, null, 2))
        console.error('Error code:', evaluationsError.code)
        console.error('Error message:', evaluationsError.message)
        throw evaluationsError
      }
      
      console.log('✅ Loaded evaluations from database:', evaluationsData?.length || 0)

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
  }

  useEffect(() => {
    loadEvaluations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, role, userId, refreshKey])

  return (
    <div>
      <div className="mb-4 md:mb-6">
        <div className="flex gap-2 md:gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`px-3 md:px-4 py-2 font-medium text-sm md:text-base ${
              activeTab === 'in_progress'
                ? 'bg-gray-100 border-b-2 border-black text-black'
                : 'text-black hover:bg-gray-50'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 md:px-4 py-2 font-medium text-sm md:text-base ${
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
        <div className="text-center py-12">Loading...</div>
      ) : evaluations.length === 0 ? (
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
                  className="flex items-center gap-3 md:gap-4 flex-1 min-w-0"
                >
                  {role === 'scout' ? (
                  // Scout view: Show player being evaluated
                  <>
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {evaluation.player?.avatar_url ? (
                        <Image
                          src={evaluation.player.avatar_url}
                          alt={evaluation.player.full_name || 'Player'}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
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
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {evaluation.scout?.avatar_url ? (
                        <Image
                          src={evaluation.scout.avatar_url}
                          alt={evaluation.scout.full_name || 'Scout'}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
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
                      <h3 className="font-bold text-black text-base md:text-lg mb-1 flex items-center gap-2 truncate">
                        {evaluation.scout?.full_name || 'Unknown Scout'}
                        <VerificationBadge />
                      </h3>
                      <p className="text-black text-xs md:text-sm truncate">
                        {evaluation.scout?.position && evaluation.scout?.organization
                          ? `${evaluation.scout.position} at ${evaluation.scout.organization}`
                          : evaluation.scout?.position
                          ? evaluation.scout.position
                          : evaluation.scout?.organization
                          ? evaluation.scout.organization
                          : 'Scout'}
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
                {role === 'scout' && activeTab === 'completed' && evaluation.status === 'completed' && (
                  <div className="flex flex-col items-end text-green-600 text-sm md:text-base">
                    <span className="font-normal">
                      +$
                      {roundedPayout.toLocaleString('en-US')}
                    </span>
                  </div>
                )}
                {/* Show menu for players with pending evaluations */}
                {role === 'player' && activeTab === 'in_progress' && (
                  <div
                    className="flex-shrink-0"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    <HeaderMenu
                      userId={userId}
                      evaluationId={evaluation.id}
                      onCancelled={() => {
                        console.log('🔄 onCancelled called, removing evaluation:', evaluation.id)
                        // Optimistically remove from list
                        setEvaluations((prev) => {
                          const filtered = prev.filter((e) => e.id !== evaluation.id)
                          console.log('📋 Updated evaluations list:', filtered.length)
                          return filtered
                        })
                        // Then trigger full reload
                        setRefreshKey((prev) => prev + 1)
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

