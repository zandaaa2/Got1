import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthInline from '@/components/auth/AuthInline'
import AuthButtons from '@/components/auth/AuthButtons'
import { Suspense } from 'react'

const MyEvalsContent = dynamicImport(() => import('@/components/my-evals/MyEvalsContent'), {
  ssr: false,
})

export const dynamic = 'force-dynamic'
export const revalidate = 0 // Disable caching completely

export default async function MyEvalsPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If no session, show auth form inline
  if (!session) {
    const headerContent = <AuthButtons />
    
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar activePage="my-evals" />
        <DynamicLayout header={headerContent}>
          <div className="pt-8">
            <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-8">My Evals</h1>
            <AuthInline mode="signin" />
          </div>
        </DynamicLayout>
      </div>
    )
  }

  // Get user profile to determine role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, avatar_url, full_name, username')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error fetching profile for my-evals:', profileError)
    redirect('/profile/setup')
  }

  if (!profile) {
    redirect('/profile/setup')
  }

  // Determine valid role - parents should see evaluations they purchased
  const validRole = profile.role === 'scout' ? 'scout' : profile.role === 'parent' ? 'parent' : 'player'

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="my-evals" />
      <DynamicLayout header={null}>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-8">My Evals</h1>
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <MyEvalsContent role={validRole} userId={session.user.id} />
          </Suspense>
        </div>
      </DynamicLayout>
    </div>
  )
}

