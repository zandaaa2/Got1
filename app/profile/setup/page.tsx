import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ProfileSetupForm from '@/components/profile/ProfileSetupForm'
import PageContent from '@/components/layout/PageContent'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'

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
  const gradientClass = getGradientForId(session.user.id)
  const fallbackInitial = (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'U').charAt(0).toUpperCase()

  const headerContent = sanitizedAvatar ? (
    <img
      src={sanitizedAvatar}
      alt="Profile"
      className="w-10 h-10 rounded-full object-cover"
    />
  ) : (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${gradientClass}`}>
      {fallbackInitial}
    </div>
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

