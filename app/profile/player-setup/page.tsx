import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import PlayerSetupForm from '@/components/profile/PlayerSetupForm'
import PageContent from '@/components/layout/PageContent'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'

export default async function PlayerSetupPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  // If no profile exists, redirect to user-setup first
  if (!profile) {
    redirect('/profile/user-setup')
  }

  // If profile is already a player with complete info, redirect to profile
  if (profile.role === 'player' && profile.hudl_link && profile.position && profile.school) {
    redirect('/profile')
  }

  // Get user info from auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const headerContent = (
    <HeaderUserAvatar
      userId={session.user.id}
      avatarUrl={profile?.avatar_url}
      fullName={profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name}
      email={user?.email}
    />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <PageContent header={headerContent}>
        <PlayerSetupForm profile={profile} />
      </PageContent>
    </div>
  )
}

