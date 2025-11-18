import { createServerClient } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'
import dynamicImport from 'next/dynamic'
import Link from 'next/link'
import { getSchoolByUsername } from '@/lib/high-school/school'
import { isHighSchoolAdmin } from '@/lib/high-school/school'

const EvaluationsDashboard = dynamicImport(() => import('@/components/high-school/EvaluationsDashboard'), {
  ssr: false,
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EvaluationsPage({
  params,
}: {
  params: { username: string }
}) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  const school = await getSchoolByUsername(params.username)

  if (!school) {
    notFound()
  }

  const isAdmin = await isHighSchoolAdmin(session.user.id, school.id)

  if (!isAdmin) {
    redirect(`/high-school/${params.username}`)
  }

  // Get pending evaluations (awaiting school payment)
  const { data: pendingEvals } = await supabase
    .from('high_school_evaluations')
    .select(`
      id,
      evaluation_id,
      player_id,
      paid_by,
      evaluation:evaluations(
        id,
        status,
        price,
        created_at,
        scout:profiles!evaluations_scout_id_fkey(
          id,
          full_name,
          avatar_url,
          organization
        ),
        player:profiles!evaluations_player_id_fkey(
          id,
          full_name,
          avatar_url
        )
      )
    `)
    .eq('high_school_id', school.id)
    .eq('paid_by', 'school')
    .in('evaluations.status', ['requested'])

  // Get all school evaluations
  const { data: allEvals } = await supabase
    .from('high_school_evaluations')
    .select(`
      id,
      evaluation_id,
      player_id,
      paid_by,
      shared_by_player,
      school_cancelled_at,
      evaluation:evaluations(
        id,
        status,
        price,
        notes,
        created_at,
        scout:profiles!evaluations_scout_id_fkey(
          id,
          full_name,
          avatar_url,
          organization
        ),
        player:profiles!evaluations_player_id_fkey(
          id,
          full_name,
          avatar_url
        )
      )
    `)
    .eq('high_school_id', school.id)
    .order('created_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, avatar_url, full_name, username')
    .eq('user_id', session.user.id)
    .single()

  const headerContent = profile ? (
    <HeaderUserAvatar
      userId={session.user.id}
      avatarUrl={profile.avatar_url}
      fullName={profile.full_name}
      username={profile.username}
      email={session.user.email}
    />
  ) : (
    <HeaderUserAvatar userId={session.user.id} email={session.user.email} />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage={undefined} />
      <DynamicLayout header={headerContent}>
        <div className="max-w-6xl mx-auto py-8 px-4">
          <div className="mb-6">
            <Link
              href={`/high-school/${params.username}`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to School Page
            </Link>
          </div>
          <EvaluationsDashboard
            schoolId={school.id}
            schoolUsername={params.username}
            pendingEvals={pendingEvals || []}
            allEvals={allEvals || []}
          />
        </div>
      </DynamicLayout>
    </div>
  )
}


