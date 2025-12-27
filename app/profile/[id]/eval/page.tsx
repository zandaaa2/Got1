import { createServerClient } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'

const EvaluationDetail = dynamicImport(() => import('@/components/evaluations/EvaluationDetail'), {
  ssr: false,
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Page for viewing an evaluation in the context of a player profile.
 * URL: /profile/{id}/eval
 * Finds the active evaluation between the current user (scout) and the player.
 */
export default async function ProfileEvalPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Get player profile by ID
  const { data: playerProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .eq('role', 'player')
    .maybeSingle()

  if (!playerProfile) {
    notFound()
  }

  // Get current user's profile to check if they're a scout
  const { data: scoutProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!scoutProfile || scoutProfile.role !== 'scout') {
    redirect(`/profile/${params.id}`)
  }

  // Find the active evaluation between this scout and player
  const { data: evaluation } = await supabase
    .from('evaluations')
    .select('*')
    .eq('scout_id', session.user.id)
    .eq('player_id', playerProfile.user_id)
    .in('status', ['in_progress', 'pending', 'confirmed', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!evaluation) {
    // No evaluation found, redirect to profile
    redirect(`/profile/${params.id}`)
  }

  // Manually join profiles
  const userIds = [evaluation.scout_id, evaluation.player_id].filter(Boolean)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('user_id', userIds)

  const evaluationWithProfiles = {
    ...evaluation,
    share_token: evaluation.share_token || null,
    scout: profiles?.find((p) => p.user_id === evaluation.scout_id) || null,
    player: profiles?.find((p) => p.user_id === evaluation.player_id) || null,
  }

  const isScout = session.user.id === evaluation.scout_id
  const profilePath = playerProfile.username ? `/${playerProfile.username}` : `/profile/${params.id}`

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="my-evals" />
      <DynamicLayout header={null}>
        <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
          <EvaluationDetail
            evaluation={evaluationWithProfiles}
            isScout={isScout}
            userId={session.user.id}
            scoutProfile={isScout ? scoutProfile : undefined}
            profilePath={profilePath}
          />
        </Suspense>
      </DynamicLayout>
    </div>
  )
}











