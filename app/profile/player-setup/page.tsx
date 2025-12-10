import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import PlayerSetupForm from '@/components/profile/PlayerSetupForm'
import DynamicLayout from '@/components/layout/DynamicLayout'

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

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={null}>
        <PlayerSetupForm profile={profile} />
      </DynamicLayout>
    </div>
  )
}

