import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import UserSetupForm from '@/components/profile/UserSetupForm'
import DynamicLayout from '@/components/layout/DynamicLayout'
import { isMeaningfulAvatar } from '@/lib/avatar'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'

export default async function UserSetupPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if profile already exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  // If profile exists and has a role other than 'user', redirect to profile
  if (profile && profile.role !== 'user') {
    redirect('/profile')
  }

  // If profile exists with 'user' role, they can still access this page to update
  // But if they have completed player/scout setup, redirect to profile

  // Get user info from auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user avatar for header
  const rawAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || profile?.avatar_url || null
  const sanitizedAvatar = isMeaningfulAvatar(rawAvatarUrl) ? rawAvatarUrl : null
  const headerContent = (
    <HeaderUserAvatar
      userId={session.user.id}
      avatarUrl={rawAvatarUrl}
      fullName={profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name}
      email={user?.email}
    />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={headerContent}>
        <UserSetupForm
          userEmail={user?.email || ''}
          userName={profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || ''}
          userAvatar={sanitizedAvatar || ''}
        />
      </DynamicLayout>
    </div>
  )
}

