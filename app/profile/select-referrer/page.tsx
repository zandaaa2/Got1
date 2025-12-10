import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import SelectReferrerContent from '@/components/profile/SelectReferrerContent'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthRefreshHandler from '@/components/shared/AuthRefreshHandler'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SelectReferrerPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if user is a newly approved scout
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id, full_name, username, avatar_url')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (profile?.role !== 'scout') {
    redirect('/profile')
  }

  return (
    <div className="min-h-screen bg-white flex">
      <AuthRefreshHandler />
      <Sidebar />
      <DynamicLayout header={null}>
        <SelectReferrerContent session={session} />
      </DynamicLayout>
    </div>
  )
}

