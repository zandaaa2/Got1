import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ProfileSetupForm from '@/components/profile/ProfileSetupForm'
import PageContent from '@/components/layout/PageContent'
import ShareButton from '@/components/shared/ShareButton'

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
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null

  const headerContent = (
    <>
      <ShareButton url="/profile/setup" title="Complete Your Profile on Got1" />
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Profile"
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
          <span className="text-gray-600 font-semibold">U</span>
        </div>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <PageContent header={headerContent}>
        <ProfileSetupForm
          userEmail={user?.email || ''}
          userName={user?.user_metadata?.full_name || user?.user_metadata?.name || ''}
          userAvatar={user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''}
        />
      </PageContent>
    </div>
  )
}

