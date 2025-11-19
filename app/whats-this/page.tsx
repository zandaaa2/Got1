import { createServerClient } from '@/lib/supabase'
import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthButtons from '@/components/auth/AuthButtons'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'

const WhatsThisContent = dynamicImport(() => import('@/components/whats-this/WhatsThisContent'), {
  ssr: false,
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function WhatsThisPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  let profile = null
  if (session) {
    const { data } = await supabase
      .from('profiles')
      .select('id, avatar_url, full_name, username')
      .eq('user_id', session.user.id)
      .maybeSingle()
    profile = data
  }

  // Fetch unique organizations from verified scouts
  const { data: organizationsData } = await supabase
    .from('profiles')
    .select('organization')
    .eq('role', 'scout')
    .not('organization', 'is', null)
    .neq('organization', '')

  const uniqueOrganizations = Array.from(
    new Set(
      organizationsData
        ?.map((p) => p.organization)
        .filter((org): org is string => org !== null && org !== '')
    )
  ).slice(0, 12) // Limit to 12 organizations

  // Fetch up to 5 profiles with avatars for trust section
  const { data: profileAvatarsRaw } = await supabase
    .from('profiles')
    .select('id, avatar_url, full_name')
    .not('avatar_url', 'is', null)
    .neq('avatar_url', '')
    .limit(10)
  
  // Filter to only include meaningful avatars (not placeholder URLs)
  const { isMeaningfulAvatar } = await import('@/lib/avatar')
  const profileAvatars = profileAvatarsRaw
    ?.filter((p) => isMeaningfulAvatar(p.avatar_url))
    .slice(0, 5) || []

  const headerContent = session ? (
    profile ? (
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
  ) : (
    <AuthButtons />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="whats-this" />
      <DynamicLayout header={headerContent}>
        <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
          <WhatsThisContent 
            organizations={uniqueOrganizations} 
            hasSession={!!session}
            profileAvatars={profileAvatars || []}
          />
        </Suspense>
      </DynamicLayout>
    </div>
  )
}

