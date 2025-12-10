import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import RoleConverter from '@/components/profile/RoleConverter'

export default async function AccountTypePage() {
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

  if (!profile) {
    redirect('/profile/user-setup')
  }

  // Check if user has pending scout application
  const { data: scoutApplication } = await supabase
    .from('scout_applications')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'pending')
    .maybeSingle()

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={null}>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">Account Type</h1>
          <p className="text-gray-600 mb-8">
            Change your account type at any time. This will update what features are available to you.
          </p>
          <RoleConverter 
            currentRole={profile.role as 'user' | 'player' | 'scout'} 
            hasPassword={false} // Will be determined client-side
            hasPendingApplication={!!scoutApplication}
          />
        </div>
      </DynamicLayout>
    </div>
  )
}

