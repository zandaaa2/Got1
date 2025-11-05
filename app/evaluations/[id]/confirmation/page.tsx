import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ConfirmationContent from '@/components/evaluations/ConfirmationContent'
import DynamicLayout from '@/components/layout/DynamicLayout'
import Link from 'next/link'

export default async function ConfirmationPage({
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

  const { data: evaluation } = await supabase
    .from('evaluations')
    .select(`
      *,
      scout:profiles!evaluations_scout_id_fkey(*),
      player:profiles!evaluations_player_id_fkey(*)
    `)
    .eq('id', params.id)
    .single()

  if (!evaluation || evaluation.scout_id !== session.user.id) {
    redirect('/my-evals')
  }

  const { data: profile } = await supabase
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
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-600 font-semibold">S</span>
          </div>
        )}
      </Link>
    </>
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="my-evals" />
      <DynamicLayout header={headerContent}>
        <ConfirmationContent evaluation={evaluation} />
      </DynamicLayout>
    </div>
  )
}

