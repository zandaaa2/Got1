import { createServerClient } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'
import dynamicImport from 'next/dynamic'
import Link from 'next/link'
import { getSchoolByUsername } from '@/lib/high-school/school'
import { isHighSchoolAdmin } from '@/lib/high-school/school'

const BillingDashboard = dynamicImport(() => import('@/components/high-school/BillingDashboard'), {
  ssr: false,
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function BillingPage({
  params,
}: {
  params: { username: string }
}) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  const school = await getSchoolByUsername(params.username)

  if (!school) {
    notFound()
  }

  const isAdmin = await isHighSchoolAdmin(session.user.id, school.id)

  if (!isAdmin) {
    redirect(`/high-school/${params.username}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, avatar_url, full_name, username')
    .eq('user_id', session.user.id)
    .single()

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
      <Sidebar activePage="high-school-billing" />
      <DynamicLayout header={headerContent}>
        <div className="max-w-6xl mx-auto py-8 px-4">
          <div className="mb-6">
            <Link
              href={`/high-school/${params.username}`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to School Page
            </Link>
          </div>
          <BillingDashboard school={school} />
        </div>
      </DynamicLayout>
    </div>
  )
}

