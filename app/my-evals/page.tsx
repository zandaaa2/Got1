import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import MyEvalsContent from '@/components/my-evals/MyEvalsContent'
import Sidebar from '@/components/layout/Sidebar'
import PageContent from '@/components/layout/PageContent'
import AuthInline from '@/components/auth/AuthInline'
import AuthButtons from '@/components/auth/AuthButtons'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0 // Disable caching completely

export default async function MyEvalsPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If no session, show auth form inline
  if (!session) {
    const headerContent = <AuthButtons />
    
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar activePage="my-evals" />
        <PageContent header={headerContent}>
          <div className="pt-8">
            <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-8">My Evals</h1>
            <AuthInline mode="signin" />
          </div>
        </PageContent>
      </div>
    )
  }

  // Get user profile to determine role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, avatar_url')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error fetching profile for my-evals:', profileError)
    redirect('/profile/setup')
  }

  if (!profile) {
    redirect('/profile/setup')
  }

  // Ensure role is valid (should be 'player' or 'scout')
  const validRole = profile.role === 'scout' ? 'scout' : 'player'

  const headerContent = (
    <Link href="/profile" className="cursor-pointer hover:opacity-80 transition-opacity">
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt="Profile"
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
          <span className="text-gray-600 font-semibold">
            {profile.role === 'player' ? 'P' : 'S'}
          </span>
        </div>
      )}
    </Link>
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="my-evals" />
      <PageContent header={headerContent}>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-8">My Evals</h1>
          <MyEvalsContent role={validRole} userId={session.user.id} />
        </div>
      </PageContent>
    </div>
  )
}

