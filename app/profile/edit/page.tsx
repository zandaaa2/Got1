import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ProfileEditForm from '@/components/profile/ProfileEditForm'
import DynamicLayout from '@/components/layout/DynamicLayout'

export default async function ProfileEditPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  // If no profile exists, redirect to user-setup
  if (!profile) {
    redirect('/profile/user-setup')
  }

  // Check if profile has been saved for the first time
  // If updated_at is very close to created_at (within 5 seconds), it hasn't been saved yet
  const profileCreatedAt = new Date(profile.created_at)
  const profileUpdatedAt = new Date(profile.updated_at)
  const timeDiff = Math.abs(profileUpdatedAt.getTime() - profileCreatedAt.getTime())
  // If updated_at is within 5 seconds of created_at, consider it unsaved
  const isNewProfile = timeDiff < 5000

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <DynamicLayout header={null}>
        <ProfileEditForm profile={profile} isNewProfile={isNewProfile} />
      </DynamicLayout>
    </div>
  )
}

