import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ProfileSetupForm from '@/components/profile/ProfileSetupForm'
import PageContent from '@/components/layout/PageContent'
import { isMeaningfulAvatar } from '@/lib/avatar'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'

export default async function ProfileSetupPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if profile already exists (use maybeSingle to avoid errors)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (profile) {
    redirect('/profile')
  }

  // Get user info from auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user avatar for header
  const rawAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
  const sanitizedAvatar = isMeaningfulAvatar(rawAvatarUrl) ? rawAvatarUrl : null
  const headerContent = (
    <HeaderUserAvatar
      userId={session.user.id}
      avatarUrl={rawAvatarUrl}
      fullName={user?.user_metadata?.full_name || user?.user_metadata?.name}
      email={user?.email}
    />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <PageContent header={headerContent}>
        <ProfileSetupForm
          userEmail={user?.email || ''}
          userName={user?.user_metadata?.full_name || user?.user_metadata?.name || ''}
          userAvatar={sanitizedAvatar || ''}
        />
      </PageContent>
    </div>
  )
}

