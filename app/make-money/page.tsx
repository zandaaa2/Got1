import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthButtons from '@/components/auth/AuthButtons'
import MakeMoneyContent from '@/components/make-money/MakeMoneyContent'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MakeMoneyPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle()
    
    // Redirect players away from this page
    if (profile?.role === 'player') {
      redirect('/browse')
    }
  }

  const headerContent = session ? null : <AuthButtons />

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="make-money" />
      <DynamicLayout header={headerContent}>
        <MakeMoneyContent session={session} />
      </DynamicLayout>
    </div>
  )
}

