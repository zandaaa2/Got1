import { createServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ProfileView from '@/components/profile/ProfileView'
import Sidebar from '@/components/layout/Sidebar'
import ShareButton from '@/components/shared/ShareButton'
import DynamicLayout from '@/components/layout/DynamicLayout'
import Link from 'next/link'

export default async function ProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!profile) {
    notFound()
  }

  const isOwnProfile = session?.user?.id === profile.user_id

  let userProfile = null
  if (session) {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', session.user.id)
      .single()
    userProfile = data
  }

  const headerContent = session ? (
    <>
      <ShareButton url={`/profile/${params.id}`} title={profile.full_name || 'Profile'} />
      <Link href="/profile" className="cursor-pointer hover:opacity-80 transition-opacity">
        {userProfile?.avatar_url ? (
          <img
            src={userProfile.avatar_url}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-600 font-semibold">U</span>
          </div>
        )}
      </Link>
    </>
  ) : (
    <>
      <a
        href="/auth/signin"
        className="px-4 py-2 border border-black rounded text-black hover:bg-gray-50"
      >
        Sign In
      </a>
      <a
        href="/auth/signup"
        className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
      >
        Sign Up
      </a>
    </>
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={headerContent}>
        <ProfileView profile={profile} isOwnProfile={isOwnProfile} />
      </DynamicLayout>
    </div>
  )
}

