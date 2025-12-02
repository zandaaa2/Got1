import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import UserSetupForm from '@/components/profile/UserSetupForm'
import DynamicLayout from '@/components/layout/DynamicLayout'
import { isMeaningfulAvatar } from '@/lib/avatar'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'

export default async function UserSetupPage({
  searchParams,
}: {
  searchParams: { ref?: string } // REFERRAL PROCESS TEMPORARILY DISABLED - ref param kept for compatibility but not used
}) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if profile already exists and has required fields
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username, birthday, role, avatar_url')
    .eq('user_id', session.user.id)
    .maybeSingle()

  // Check if profile has all required fields
  const hasRequiredFields = profile && 
    profile.full_name && 
    profile.username && 
    profile.birthday

  // CRITICAL: If profile exists but doesn't have required fields, reset role to 'user'
  // This ensures users can't bypass role selection by having an incomplete profile with wrong role
  if (profile && !hasRequiredFields && profile.role !== 'user') {
    await supabase
      .from('profiles')
      .update({ role: 'user' })
      .eq('user_id', session.user.id)
  }

  // If profile exists and has all required fields AND has a role other than 'user', redirect to profile
  // This means they've completed setup and selected a role
  if (hasRequiredFields && profile && profile.role !== 'user') {
    redirect('/profile')
  }

  // If profile exists with required fields and 'user' role, they can still access this page to update
  // But if they have completed player/scout/parent setup, redirect to profile

  // Get user info from auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user avatar for header
  const rawAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || profile?.avatar_url || null
  const sanitizedAvatar = isMeaningfulAvatar(rawAvatarUrl) ? rawAvatarUrl : null
  const headerContent = (
    <HeaderUserAvatar
      userId={session.user.id}
      avatarUrl={rawAvatarUrl}
      fullName={profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name}
      email={user?.email}
    />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={headerContent}>
        {/* REFERRAL PROCESS TEMPORARILY DISABLED - referrerId prop removed */}
        <UserSetupForm
          userEmail={user?.email || ''}
          userName={profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || ''}
          userAvatar={sanitizedAvatar || ''}
        />
      </DynamicLayout>
    </div>
  )
}

