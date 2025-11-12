import { createServerClient } from '@/lib/supabase'
import BrowseContent from '@/components/browse/BrowseContent'
import Sidebar from '@/components/layout/Sidebar'
import PageContent from '@/components/layout/PageContent'
import AuthButtons from '@/components/auth/AuthButtons'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'
import AuthRefreshHandler from '@/components/shared/AuthRefreshHandler'
export const dynamic = 'force-dynamic'
export const revalidate = 0


export default async function Home() {
  const supabase = createServerClient()
  
  // Try getUser first (which middleware should have refreshed)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  // Also try getSession
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  // Debug logging (check server terminal, not browser console)
  console.log('=== Home Page Session Check ===')
  if (userError) {
    console.error('User error:', userError)
  }
  if (sessionError) {
    console.error('Session error:', sessionError)
  }
  console.log('User exists:', !!user, 'User ID:', user?.id)
  console.log('Session exists:', !!session, 'Session User ID:', session?.user?.id)

  let profile = null
  if (session) {
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, avatar_url, full_name, username')
      .eq('user_id', session.user.id)
      .maybeSingle()
    
    if (profileError) {
      console.error('Profile query error:', profileError)
    }
    
    profile = data
    console.log('Profile found:', !!profile)
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
      <PageContent header={headerContent}>
        <BrowseContent session={session} />
      </PageContent>
    </div>
  )
}

