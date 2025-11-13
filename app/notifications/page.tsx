import { createServerClient } from '@/lib/supabase'
import NotificationsContent from '@/components/notifications/NotificationsContent'
import Sidebar from '@/components/layout/Sidebar'
import PageContent from '@/components/layout/PageContent'
import AuthButtons from '@/components/auth/AuthButtons'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function NotificationsPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    const headerContent = <AuthButtons />
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />
        <PageContent header={headerContent}>
          <div className="pt-8">
            <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-8">Notifications</h1>
            <p className="text-gray-600">Please sign in to view your notifications.</p>
          </div>
        </PageContent>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, avatar_url, full_name, username')
    .eq('user_id', session.user.id)
    .maybeSingle()

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
      <Sidebar />
      <PageContent header={headerContent}>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-8">Notifications</h1>
          <NotificationsContent userId={session.user.id} />
        </div>
      </PageContent>
    </div>
  )
}

