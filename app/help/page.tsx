import { createServerClient } from '@/lib/supabase'
import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthButtons from '@/components/auth/AuthButtons'

const HelpContent = dynamicImport(() => import('@/components/help/HelpContent'), {
  ssr: false,
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HelpPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  let userRole: string | null = null
  if (session?.user?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle()
    
    userRole = profile?.role || null
  }

  const headerContent = session ? null : <AuthButtons />

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="help" />
      <DynamicLayout header={headerContent}>
        <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
          <HelpContent userRole={userRole} hasSession={!!session} />
        </Suspense>
      </DynamicLayout>
    </div>
  )
}

