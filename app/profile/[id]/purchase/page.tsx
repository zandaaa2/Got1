import { createServerClient } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import PurchaseEvaluation from '@/components/profile/PurchaseEvaluation'
import DynamicLayout from '@/components/layout/DynamicLayout'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'

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
    .select('avatar_url, full_name, username')
    .eq('user_id', session.user.id)
    .single()

  const headerContent = (
    <HeaderUserAvatar
      userId={session.user.id}
      avatarUrl={userProfile?.avatar_url}
      fullName={userProfile?.full_name}
      username={userProfile?.username}
      email={session.user.email}
    />
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

