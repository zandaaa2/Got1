import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import BrowseContent from '@/components/browse/BrowseContent'
import Sidebar from '@/components/layout/Sidebar'
import ShareButton from '@/components/shared/ShareButton'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthButtons from '@/components/auth/AuthButtons'
import Link from 'next/link'

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
      .select('id, avatar_url')
      .eq('user_id', session.user.id)
      .single()
    profile = data
  }

  const headerContent = session ? (
    <>
      <ShareButton url="/browse" />
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
      <DynamicLayout header={headerContent}>
        <BrowseContent session={session} />
      </DynamicLayout>
    </div>
  )
}

