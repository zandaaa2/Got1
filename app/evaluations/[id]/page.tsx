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
  // Try to include share_token if column exists (may not exist if migration hasn't run)
  let evaluation
  let evaluationError
  
  try {
    // First try with share_token
    const result = await supabase
      .from('evaluations')
      .select('*, share_token')
      .eq('id', params.id)
      .maybeSingle()
    
    evaluation = result.data
    evaluationError = result.error
    
    // If error is due to column not existing, try without share_token
    if (evaluationError && (evaluationError.code === '42703' || evaluationError.message?.includes('column "share_token" does not exist'))) {
      console.warn('share_token column not found, fetching without it')
      const resultWithoutToken = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', params.id)
        .maybeSingle()
      
      evaluation = resultWithoutToken.data
      evaluationError = resultWithoutToken.error
      // Add share_token as null if it doesn't exist
      if (evaluation) {
        evaluation.share_token = null
      }
    }
  } catch (error) {
    console.error('Error fetching evaluation:', error)
    evaluationError = error as any
  }

  if (evaluationError && evaluationError.code !== '42703') {
    console.error('Error fetching evaluation:', evaluationError)
    notFound()
  }

  if (!evaluation) {
    console.error('Evaluation not found:', params.id)
    notFound()
  }

  // Check if user is the scout or player (for UI purposes)
  // But allow ALL users to view evaluations (for sharing)
  const isScout = session.user.id === evaluation.scout_id
  const isPlayer = session.user.id === evaluation.player_id

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
      share_token: evaluation.share_token, // Ensure share_token is included
      scout: profiles?.find((p) => p.user_id === evaluation.scout_id) || null,
      player: profiles?.find((p) => p.user_id === evaluation.player_id) || null,
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, full_name, username')
    .eq('user_id', session.user.id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="my-evals" />
      <DynamicLayout header={null}>
        <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
          <EvaluationDetail
            evaluation={evaluationWithProfiles}
            isScout={isScout}
            userId={session.user.id}
            scoutProfile={isScout ? profile : undefined}
          />
        </Suspense>
      </DynamicLayout>
    </div>
  )
}

