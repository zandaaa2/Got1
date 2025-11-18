import { createServerClient } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'
import dynamicImport from 'next/dynamic'
import Link from 'next/link'
import { getSchoolByUsername } from '@/lib/high-school/school'
import { isHighSchoolAdmin } from '@/lib/high-school/school'

const RosterManagement = dynamicImport(() => import('@/components/high-school/RosterManagement'), {
  ssr: false,
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function RosterPage({
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

  // Get school
  const school = await getSchoolByUsername(params.username)

  if (!school) {
    notFound()
  }

  // Check if user is admin
  const isAdmin = await isHighSchoolAdmin(session.user.id, school.id)

  if (!isAdmin) {
    redirect(`/high-school/${params.username}`)
  }

  // Get all players (including released)
  const { data: players } = await supabase
    .from('high_school_players')
    .select(`
      id,
      name,
      positions,
      email,
      username,
      user_id,
      invite_sent_at,
      joined_at,
      released_at,
      release_requested_at,
      profiles:profiles!high_school_players_user_id_fkey(
        id,
        full_name,
        avatar_url,
        username
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
      <Sidebar activePage="high-school-roster" />
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
          <RosterManagement schoolId={school.id} schoolUsername={params.username} players={players || []} />
        </div>
      </DynamicLayout>
    </div>
  )
}

