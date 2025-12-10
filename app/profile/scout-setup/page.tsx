import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ScoutSetupForm from '@/components/profile/ScoutSetupForm'
import DynamicLayout from '@/components/layout/DynamicLayout'

export default async function ScoutSetupPage() {
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

  // If profile is already a scout with complete info, redirect to profile
  if (profile.role === 'scout' && profile.organization && profile.position && profile.social_link) {
    redirect('/profile')
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={null}>
        <ScoutSetupForm profile={profile} />
      </DynamicLayout>
    </div>
  )
}

