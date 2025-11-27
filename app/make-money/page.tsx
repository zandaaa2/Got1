import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'
import AuthButtons from '@/components/auth/AuthButtons'
import MakeMoneyContent from '@/components/make-money/MakeMoneyContent'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MakeMoneyPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  let profile = null
  if (session) {
    const { data } = await supabase
      .from('profiles')
      .select('id, avatar_url, full_name, username, role')
      .eq('user_id', session.user.id)
      .maybeSingle()
    profile = data
    
    // Redirect players away from this page
    if (profile?.role === 'player') {
      redirect('/browse')
    }
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
      <Sidebar activePage="make-money" />
      <DynamicLayout header={headerContent}>
        <MakeMoneyContent session={session} />
      </DynamicLayout>
    </div>
  )
}

