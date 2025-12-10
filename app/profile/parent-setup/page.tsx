import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ParentSetupForm from '@/components/profile/ParentSetupForm'
import DynamicLayout from '@/components/layout/DynamicLayout'

export default async function ParentSetupPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  // If no profile exists, redirect to user-setup first
  if (!profile) {
    redirect('/profile/user-setup')
  }

  // If profile is already a parent, redirect to profile
  if (profile.role === 'parent') {
    redirect('/profile')
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={null}>
        <ParentSetupForm profile={profile} />
      </DynamicLayout>
    </div>
  )
}




