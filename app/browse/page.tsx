import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import BrowseContent from '@/components/browse/BrowseContent'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthButtons from '@/components/auth/AuthButtons'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'
import AuthRefreshHandler from '@/components/shared/AuthRefreshHandler'

export const dynamic = 'force-dynamic'
export const revalidate = 0 // Disable caching completely

export default async function BrowsePage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  let profile = null
  if (session) {
    const { data } = await supabase
      .from('profiles')
      .select('id, avatar_url, full_name, username')
      .eq('user_id', session.user.id)
      .single()
    profile = data
  }

  const headerContent = session ? (
    profile ? (
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
  ) : (
    <AuthButtons />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <AuthRefreshHandler />
      <Sidebar activePage="browse" />
      <DynamicLayout header={headerContent}>
        <BrowseContent session={session} />
      </DynamicLayout>
    </div>
  )
}

