import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ProfileEditForm from '@/components/profile/ProfileEditForm'
import DynamicLayout from '@/components/layout/DynamicLayout'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

  // Debug: Log profile role to help diagnose why player fields aren't showing
  console.log('🔍 ProfileEditPage - Profile role:', profile.role)
  console.log('🔍 ProfileEditPage - Profile has player data?', {
    hasHudlLink: !!profile.hudl_link,
    hasPosition: !!profile.position,
    hasSchool: !!profile.school,
    hasGraduationYear: !!profile.graduation_year
  })

  // Auto-fix: If role is 'user' but profile has player data, update role to 'player'
  if (profile.role === 'user' && (profile.hudl_link || profile.position || profile.school)) {
    console.log('⚠️ ProfileEditPage - Auto-fixing role from "user" to "player"')
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'player' })
      .eq('user_id', session.user.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ ProfileEditPage - Error auto-fixing role:', updateError)
    } else if (updatedProfile) {
      console.log('✅ ProfileEditPage - Role auto-fixed to:', updatedProfile.role)
      profile = updatedProfile
    }
  }

  // Check if profile has been saved for the first time
  // If updated_at is very close to created_at (within 5 seconds), it hasn't been saved yet
  const profileCreatedAt = new Date(profile.created_at)
  const profileUpdatedAt = new Date(profile.updated_at)
  const timeDiff = Math.abs(profileUpdatedAt.getTime() - profileCreatedAt.getTime())
  // If updated_at is within 5 seconds of created_at, consider it unsaved
  const isNewProfile = timeDiff < 5000

  // Check if user has a pending scout application (for users with role='user')
  let pendingScoutApplication = null
  if (profile.role === 'user') {
    const { data: scoutApplication } = await supabase
      .from('scout_applications')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'pending')
      .maybeSingle()
    
    if (scoutApplication) {
      pendingScoutApplication = scoutApplication
      // Merge scout application data into profile for the form
      profile = {
        ...profile,
        organization: profile.organization || scoutApplication.current_workplace || '',
        position: profile.position || scoutApplication.current_position || '',
        work_history: profile.work_history || scoutApplication.work_history || '',
        social_link: profile.social_link || scoutApplication.social_link || '',
        additional_info: profile.additional_info || scoutApplication.additional_info || '',
      }
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <DynamicLayout header={null}>
        <ProfileEditForm 
          profile={profile} 
          isNewProfile={isNewProfile}
          pendingScoutApplication={pendingScoutApplication}
        />
      </DynamicLayout>
    </div>
  )
}

