import { createServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'
import AuthButtons from '@/components/auth/AuthButtons'
import dynamicImport from 'next/dynamic'
import { getSchoolByUsername } from '@/lib/high-school/school'
import { isHighSchoolAdmin } from '@/lib/high-school/school'

const PublicSchoolView = dynamicImport(() => import('@/components/high-school/PublicSchoolView'), {
  ssr: false,
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Public high school page
 */
export default async function HighSchoolPage({
  params,
}: {
  params: { username: string }
}) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Get school (must be approved)
  const school = await getSchoolByUsername(params.username)

  if (!school) {
    notFound()
  }

  // Check if user is admin
  let isAdmin = false
  if (session) {
    isAdmin = await isHighSchoolAdmin(session.user.id, school.id)
  }

  // Get players (active, not released)
  const { data: players } = await supabase
    .from('high_school_players')
    .select(`
      id,
      name,
      positions,
      jersey_number,
      graduation_month,
      graduation_year,
      user_id,
      profiles:profiles!high_school_players_user_id_fkey(
        id,
        full_name,
        avatar_url,
        username
      )
    `)
    .eq('high_school_id', school.id)
    .is('released_at', null)
    .order('name', { ascending: true })

  // Separate coaches and players
  const coaches = (players || []).filter((p: any) =>
    p.positions && Array.isArray(p.positions) && p.positions.includes('Coach')
  )
  const activePlayers = (players || []).filter(
    (p: any) =>
      !p.positions ||
      !Array.isArray(p.positions) ||
      !p.positions.includes('Coach')
  )

  // Get evaluations (school-paid or shared by player)
  const { data: evaluations } = await supabase
    .from('high_school_evaluations')
    .select(`
      evaluation:evaluations(
        id,
        status,
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
    .or('paid_by.eq.school,shared_by_player.eq.true')
    .order('created_at', { ascending: false })

  let profile = null
  if (session) {
    const { data } = await supabase
      .from('profiles')
      .select('id, avatar_url, full_name, username')
      .eq('user_id', session.user.id)
      .single()
    profile = data
  }

  const headerContent = session ? (
    profile ? (
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
  ) : (
    <AuthButtons />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage={isAdmin ? undefined : 'browse'} />
      <DynamicLayout header={headerContent}>
        <PublicSchoolView
          school={school}
          isAdmin={isAdmin}
          coaches={coaches || []}
          players={activePlayers || []}
          evaluations={evaluations || []}
        />
      </DynamicLayout>
    </div>
  )
}

