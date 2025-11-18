import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'
import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'

const CreateSchoolForm = dynamicImport(() => import('@/components/high-school/CreateSchoolForm'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-gray-500">Loading form...</div>
    </div>
  ),
})

export const dynamic = 'force-dynamic'

export default async function CreateSchoolPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if user already has a school (skip if table doesn't exist)
  try {
    const { getUserHighSchool } = await import('@/lib/high-school/school')
    const existingSchool = await getUserHighSchool(session.user.id)
    if (existingSchool) {
      redirect(`/high-school/${existingSchool.username}`)
    }
  } catch (error: any) {
    // If getUserHighSchool fails (e.g., table doesn't exist), continue anyway
    // Don't log NEXT_REDIRECT errors
    if (error?.digest !== 'NEXT_REDIRECT') {
      console.error('Error checking for existing school:', error)
    } else {
      throw error // Re-throw redirect errors
    }
  }

  let profile = null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, avatar_url, full_name, username')
      .eq('user_id', session.user.id)
      .maybeSingle()
    profile = data
  } catch (error) {
    console.error('Error fetching profile:', error)
  }

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
      <Sidebar activePage="profile" />
      <DynamicLayout header={headerContent}>
        <div className="max-w-3xl mx-auto py-8 px-4">
          <h1 className="text-3xl font-bold text-black mb-6">Create High School Page</h1>
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading form...</div>
            </div>
          }>
            <CreateSchoolForm />
          </Suspense>
        </div>
      </DynamicLayout>
    </div>
  )
}
