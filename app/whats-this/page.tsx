import { createServerClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import ShareButton from '@/components/shared/ShareButton'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthButtons from '@/components/auth/AuthButtons'
import WhatsThisContent from '@/components/whats-this/WhatsThisContent'
import Link from 'next/link'

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
      .select('id, avatar_url')
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

  const headerContent = session ? (
    <>
      <ShareButton url="/whats-this" title="What's Got1?" />
      {profile ? (
        <Link href="/profile" className="cursor-pointer hover:opacity-80 transition-opacity">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 font-semibold">U</span>
            </div>
          )}
        </Link>
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
          <span className="text-gray-600 font-semibold">U</span>
        </div>
      )}
    </>
  ) : (
    <AuthButtons />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="whats-this" />
      <DynamicLayout header={headerContent}>
        <WhatsThisContent organizations={uniqueOrganizations} hasSession={!!session} />
      </DynamicLayout>
    </div>
  )
}

