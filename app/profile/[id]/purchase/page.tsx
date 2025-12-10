import { createServerClient } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import PurchaseEvaluation from '@/components/profile/PurchaseEvaluation'
import DynamicLayout from '@/components/layout/DynamicLayout'

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

  // Check if user is a player or parent
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (!userProfile) {
    redirect('/discover')
  }

  // Allow players and parents to purchase
  if (userProfile.role !== 'player' && userProfile.role !== 'parent') {
    redirect('/discover')
  }

  // For players, pass the player profile. For parents, pass null (they'll select children)
  const playerProfile = userProfile.role === 'player' ? userProfile : null

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="discover" />
      <DynamicLayout header={null}>
        <PurchaseEvaluation scout={profile} player={playerProfile} />
      </DynamicLayout>
    </div>
  )
}

