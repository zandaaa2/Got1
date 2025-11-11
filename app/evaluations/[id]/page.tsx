import { createServerClient } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import EvaluationDetail from '@/components/evaluations/EvaluationDetail'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'

export const dynamic = 'force-dynamic'
export const revalidate = 0 // Disable caching completely

/**
 * Page for viewing a specific evaluation.
 * Handles manual joins of profiles since evaluations reference auth.users.
 * 
 * @param params - Route parameters containing the evaluation ID
 */
export default async function EvaluationPage({
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

  // Get evaluation without joins (since foreign keys reference auth.users)
  const { data: evaluation, error: evaluationError } = await supabase
    .from('evaluations')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (evaluationError) {
    console.error('Error fetching evaluation:', evaluationError)
    notFound()
  }

  if (!evaluation) {
    notFound()
  }

  // Check if user has access to this evaluation
  const isScout = session.user.id === evaluation.scout_id
  const isPlayer = session.user.id === evaluation.player_id

  if (!isScout && !isPlayer) {
    redirect('/my-evals')
  }

  // Manually join profiles
  let evaluationWithProfiles = evaluation
  if (evaluation.scout_id || evaluation.player_id) {
    const userIds = [evaluation.scout_id, evaluation.player_id].filter(Boolean)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', userIds)

    evaluationWithProfiles = {
      ...evaluation,
      scout: profiles?.find((p) => p.user_id === evaluation.scout_id) || null,
      player: profiles?.find((p) => p.user_id === evaluation.player_id) || null,
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, full_name, username')
    .eq('user_id', session.user.id)
    .maybeSingle()

  const headerContent = (
    <HeaderUserAvatar
      userId={session.user.id}
      avatarUrl={profile?.avatar_url}
      fullName={profile?.full_name}
      username={profile?.username}
      email={session.user.email}
    />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="my-evals" />
      <DynamicLayout header={headerContent}>
        <EvaluationDetail
          evaluation={evaluationWithProfiles}
          isScout={isScout}
          userId={session.user.id}
          scoutProfile={isScout ? profile : undefined}
        />
      </DynamicLayout>
    </div>
  )
}

