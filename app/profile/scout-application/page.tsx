import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ScoutApplicationForm from '@/components/profile/ScoutApplicationForm'
import DynamicLayout from '@/components/layout/DynamicLayout'
import Link from 'next/link'

export default async function ScoutApplicationPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (!profile) {
    redirect('/profile/setup')
  }

  // If already a scout, redirect to profile
  if (profile.role === 'scout') {
    redirect('/profile')
  }

  // Check if already has pending application
  const { data: existingApplication } = await supabase
    .from('scout_applications')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'pending')
    .single()

  if (existingApplication) {
    redirect('/profile')
  }

  const { data: userProfile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('user_id', session.user.id)
    .single()

  const headerContent = (
    <>
      <button className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
        Share
      </button>
      <Link href="/profile" className="cursor-pointer hover:opacity-80 transition-opacity">
        {userProfile?.avatar_url ? (
          <img
            src={userProfile.avatar_url}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-600 font-semibold">P</span>
          </div>
        )}
      </Link>
    </>
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={headerContent}>
        <ScoutApplicationForm profile={profile} />
      </DynamicLayout>
    </div>
  )
}

