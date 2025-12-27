import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import NewBlogForm from '@/components/profile/NewBlogForm'
import BackButton from '@/components/shared/BackButton'

export default async function NewBlogPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!profile) {
    redirect('/profile')
  }

  // Only scouts can create blogs
  if (profile.role !== 'scout') {
    redirect('/profile')
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="profile" />
      <DynamicLayout header={null}>
        <main className="pt-6 md:pt-10 pb-12">
          <div className="max-w-4xl mx-auto">
            <BackButton fallbackUrl="/profile" className="mb-6 text-sm font-medium text-gray-600 hover:text-black transition-colors" />
            <NewBlogForm profile={profile} userId={session.user.id} />
          </div>
        </main>
      </DynamicLayout>
    </div>
  )
}

