import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ParentCreatePlayerForm from '@/components/profile/ParentCreatePlayerForm'
import DynamicLayout from '@/components/layout/DynamicLayout'

export default async function ParentCreatePlayerPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Get user profile - must be a parent
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  // If no profile or not a parent, redirect
  if (!profile || profile.role !== 'parent') {
    redirect('/profile/parent-setup')
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={null}>
        <ParentCreatePlayerForm parentProfile={profile} />
      </DynamicLayout>
    </div>
  )
}




