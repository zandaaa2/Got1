import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import CombinedScoutApplicationForm from '@/components/profile/CombinedScoutApplicationForm'
import ScoutApplicationForm from '@/components/profile/ScoutApplicationForm'
import DynamicLayout from '@/components/layout/DynamicLayout'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'
import Link from 'next/link'

export default async function ScoutApplicationPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  // If already a scout, redirect to profile
  if (profile && profile.role === 'scout') {
    redirect('/profile')
  }

  // Check if already has pending application
  if (profile) {
    const { data: existingApplication } = await supabase
      .from('scout_applications')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingApplication) {
      redirect('/profile')
    }
  }

  // Get user info from auth
  const userName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || ''
  const userAvatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || ''

  const headerContent = profile ? (
    <HeaderUserAvatar
      userId={session.user.id}
      avatarUrl={profile.avatar_url}
      fullName={profile.full_name}
      username={profile.username}
      email={session.user.email}
    />
  ) : (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">{session.user.email}</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="profile" />
      <DynamicLayout header={headerContent}>
        {profile && profile.full_name && profile.username && profile.birthday ? (
          // Profile already has required fields, show scout application only
          <ScoutApplicationForm profile={profile} />
        ) : (
          // Profile incomplete, show combined form
          <CombinedScoutApplicationForm
            userEmail={session.user.email || ''}
            userName={userName}
            userAvatar={userAvatar}
          />
        )}
      </DynamicLayout>
    </div>
  )
}

