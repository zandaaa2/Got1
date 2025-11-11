import { createServerClient } from '@/lib/supabase'
import BrowseContent from '@/components/browse/BrowseContent'
import Sidebar from '@/components/layout/Sidebar'
import ShareButton from '@/components/shared/ShareButton'
import PageContent from '@/components/layout/PageContent'
import AuthButtons from '@/components/auth/AuthButtons'
import Link from 'next/link'
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
      .select('id, avatar_url')
      .eq('user_id', session.user.id)
      .maybeSingle()
    
    if (profileError) {
      console.error('Profile query error:', profileError)
    }
    
    profile = data
    console.log('Profile found:', !!profile)
  }

  const headerContent = session ? (
    <>
      <ShareButton url="/" title="Browse Scouts on Got1" />
      {profile ? (
        <Link href="/profile" className="cursor-pointer hover:opacity-80 transition-opacity">
          {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt="Profile"
          className="w-10 h-10 rounded-full object-cover"
        />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 font-semibold">U</span>
            </div>
          )}
        </Link>
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
          <span className="text-gray-600 font-semibold">U</span>
        </div>
      )}
    </>
  ) : (
    <AuthButtons />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <PageContent header={headerContent}>
        <BrowseContent session={session} />
      </PageContent>
    </div>
  )
}

