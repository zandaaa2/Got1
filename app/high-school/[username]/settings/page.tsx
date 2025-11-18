import { createServerClient } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'
import dynamicImport from 'next/dynamic'
import Link from 'next/link'
import { getSchoolByUsername } from '@/lib/high-school/school'
import { isHighSchoolAdmin } from '@/lib/high-school/school'

const PageSettings = dynamicImport(() => import('@/components/high-school/PageSettings'), {
  ssr: false,
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SettingsPage({
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

  // Get admins
  const { data: adminsData } = await supabase
    .from('high_school_admins')
    .select(`
      user_id,
      profile:profiles!high_school_admins_user_id_fkey(
        id,
        full_name,
        avatar_url,
        username,
        role
      )
    `)
    .eq('high_school_id', school.id)

  // Get creator's profile if they exist
  let creatorAdmin = null
  if (school.created_by) {
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username, role, user_id')
      .eq('user_id', school.created_by)
      .maybeSingle()

    if (creatorProfile) {
      creatorAdmin = {
        user_id: school.created_by,
        profile: creatorProfile,
      }
    }
  }

  // Filter out players from admins list, but always include the creator
  let filteredAdmins = (adminsData || []).filter(admin => {
    // Always include the creator, even if they're a player
    if (admin.user_id === school.created_by) {
      return true
    }
    // For other admins, exclude players
    return admin.profile?.role !== 'player'
  })

  // Ensure creator is in the list (add if missing)
  if (creatorAdmin) {
    const creatorExists = filteredAdmins.some(admin => admin.user_id === school.created_by)
    if (!creatorExists) {
      filteredAdmins = [creatorAdmin, ...filteredAdmins]
    }
  }

  const admins = filteredAdmins

  // Get pending admin invites
  const { data: pendingInvitesData } = await supabase
    .from('high_school_admin_invites')
    .select('id, email, user_id, invited_by, created_at')
    .eq('high_school_id', school.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Fetch profile data for invites that have user_id
  const pendingInvites = await Promise.all(
    (pendingInvitesData || []).map(async (invite) => {
      let profile = null
      if (invite.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username')
          .eq('user_id', invite.user_id)
          .maybeSingle()
        profile = profileData
      }
      return { ...invite, profile }
    })
  )

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
          <PageSettings school={school} admins={admins || []} pendingInvites={pendingInvites || []} />
        </div>
      </DynamicLayout>
    </div>
  )
}

