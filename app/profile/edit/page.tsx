import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ProfileEditForm from '@/components/profile/ProfileEditForm'
import DynamicLayout from '@/components/layout/DynamicLayout'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'
import AuthButtons from '@/components/auth/AuthButtons'

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

  // If no profile exists, create a basic one with default role 'player'
  let isNewProfile = false
  if (!profile) {
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        user_id: session.user.id,
        role: 'player',
        full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
        avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating profile:', createError)
      redirect('/profile/setup')
    }
    profile = newProfile
    isNewProfile = true
  } else {
    // Check if profile has been saved for the first time
    // If updated_at is very close to created_at (within 5 seconds), it hasn't been saved yet
    const profileCreatedAt = new Date(profile.created_at)
    const profileUpdatedAt = new Date(profile.updated_at)
    const timeDiff = Math.abs(profileUpdatedAt.getTime() - profileCreatedAt.getTime())
    // If updated_at is within 5 seconds of created_at, consider it unsaved
    isNewProfile = timeDiff < 5000
  }

  const headerContent = session ? (
    <HeaderUserAvatar
      userId={session.user.id}
      avatarUrl={profile.avatar_url}
      fullName={profile.full_name}
      username={profile.username}
      email={session.user.email}
    />
  ) : (
    <AuthButtons />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <DynamicLayout header={headerContent}>
        <ProfileEditForm profile={profile} isNewProfile={isNewProfile} />
      </DynamicLayout>
    </div>
  )
}

