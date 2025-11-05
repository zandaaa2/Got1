import { createServerClient } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import PurchaseEvaluation from '@/components/profile/PurchaseEvaluation'
import DynamicLayout from '@/components/layout/DynamicLayout'
import Link from 'next/link'

export default async function PurchasePage({
  params,
}: {
  params: { id: string }
}) {
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
    .eq('id', params.id)
    .single()

  if (!profile || profile.role !== 'scout') {
    notFound()
  }

  // Check if user is a player
  const { data: playerProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (!playerProfile || playerProfile.role !== 'player') {
    redirect('/browse')
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
        <PurchaseEvaluation scout={profile} player={playerProfile} />
      </DynamicLayout>
    </div>
  )
}

