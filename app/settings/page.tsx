import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthRefreshHandler from '@/components/shared/AuthRefreshHandler'
import SettingsContent from '@/components/settings/SettingsContent'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SettingsPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!profile) {
    redirect('/profile/user-setup')
  }

  return (
    <div className="min-h-screen bg-white flex">
      <AuthRefreshHandler />
      <Sidebar activePage="settings" />
      <DynamicLayout header={null}>
        <SettingsContent profile={profile} />
      </DynamicLayout>
    </div>
  )
}
