'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import Image from 'next/image'
import VerificationBadge from '@/components/shared/VerificationBadge'

interface MyEvalsContentProps {
  role: 'player' | 'scout'
  userId: string
}

interface Evaluation {
  id: string
  scout_id: string
  player_id: string
  status: 'pending' | 'in_progress' | 'completed'
  price: number
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
  const supabase = createClient()

  useEffect(() => {
    loadEvaluations()
  }, [activeTab, role, userId])

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
        .select('id, status, price, notes, created_at, scout_id, player_id')

      if (role === 'scout') {
        query = query.eq('scout_id', userId)
      } else {
        query = query.eq('player_id', userId)
      }

      // Filter by status
      if (activeTab === 'in_progress') {
        query = query.in('status', ['pending', 'in_progress'])
      } else {
        query = query.eq('status', 'completed')
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
    } catch (error) {
      console.error('Error loading evaluations:', error)
      setEvaluations([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'in_progress'
                ? 'bg-gray-100 border-b-2 border-black text-black'
                : 'text-black hover:bg-gray-50'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 font-medium ${
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
        <div className="space-y-4">
          {evaluations.map((evaluation) => (
            <Link
              key={evaluation.id}
              href={`/evaluations/${evaluation.id}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {role === 'scout' ? (
                // Scout view: Show player being evaluated
                <>
                  <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
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
                  <div className="flex-1">
                    <h3 className="font-bold text-black text-lg mb-1">
                      {evaluation.player?.full_name || 'Unknown Player'}
                    </h3>
                    <p className="text-black text-sm">
                      {evaluation.player?.school || 'Unknown School'}
                      {evaluation.player?.school && evaluation.player?.graduation_year && ', '}
                      {evaluation.player?.graduation_year && `${evaluation.player.graduation_year}`}
                    </p>
                  </div>
                </>
              ) : (
                // Player view: Show scout evaluating them
                <>
                  <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
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
                  <div className="flex-1">
                    <h3 className="font-bold text-black text-lg mb-1 flex items-center gap-2">
                      {evaluation.scout?.full_name || 'Unknown Scout'}
                      <VerificationBadge />
                    </h3>
                    <p className="text-black text-sm">
                      {evaluation.scout?.position && evaluation.scout?.organization
                        ? `${evaluation.scout.position} at ${evaluation.scout.organization}`
                        : evaluation.scout?.position
                        ? evaluation.scout.position
                        : evaluation.scout?.organization
                        ? evaluation.scout.organization
                        : 'Scout'}
                    </p>
                  </div>
                </>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

