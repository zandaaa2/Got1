import { createServerClient } from '@/lib/supabase'
import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthButtons from '@/components/auth/AuthButtons'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'

const NotificationsContent = dynamicImport(() => import('@/components/notifications/NotificationsContent'), {
  ssr: false,
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function NotificationsPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    const headerContent = <AuthButtons />
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />
        <DynamicLayout header={headerContent}>
          <div className="pt-8">
            <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-8">Notifications</h1>
            <p className="text-gray-600">Please sign in to view your notifications.</p>
          </div>
        </DynamicLayout>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, avatar_url, full_name, username')
    .eq('user_id', session.user.id)
    .maybeSingle()

  const headerContent = profile ? (
    <HeaderUserAvatar
      userId={session.user.id}
      avatarUrl={profile.avatar_url}
      fullName={profile.full_name}
      username={profile.username}
      email={session.user.email}
    />
  ) : (
    <HeaderUserAvatar userId={session.user.id} email={session.user.email} />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <DynamicLayout header={headerContent}>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-8">Notifications</h1>
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <NotificationsContent userId={session.user.id} />
          </Suspense>
        </div>
      </DynamicLayout>
    </div>
  )
}

