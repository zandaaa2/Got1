import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ProfileContent from '@/components/profile/ProfileContent'
import DynamicLayout from '@/components/layout/DynamicLayout'
import Link from 'next/link'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'

export const dynamic = 'force-dynamic'
export const revalidate = 0 // Disable caching completely

export default async function ProfilePage() {
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
    .single()

  if (!profile) {
    redirect('/profile/setup')
  }

  // Check if user has pending or approved scout application
  const { data: scoutApplication } = await supabase
    .from('scout_applications')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'pending')
    .maybeSingle()
  
  // Also check for approved application (in case profile role wasn't updated)
  // NOTE: We only auto-fix if the application is still approved AND hasn't been denied
  // If an admin revoked scout status, the application should be denied, so we won't restore it
  const { data: approvedApplication } = await supabase
    .from('scout_applications')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'approved')
    .maybeSingle()
  
  // Check if there's a denied application that was recently reviewed (within last hour)
  // This indicates the scout status was intentionally revoked
  const { data: recentlyDeniedApplication } = await supabase
    .from('scout_applications')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'denied')
    .not('reviewed_at', 'is', null)
    .gte('reviewed_at', new Date(Date.now() - 3600000).toISOString()) // Within last hour
    .maybeSingle()
  
  // Only auto-fix if there's an approved application AND no recent denial
  // This prevents restoring scout status after admin revocation
  if (profile.role !== 'scout' && approvedApplication && !recentlyDeniedApplication) {
    console.log('⚠️ Profile role mismatch detected - updating profile to scout')
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'scout',
        organization: approvedApplication.current_workplace,
        position: approvedApplication.current_position || null,
        work_history: approvedApplication.work_history || null,
        additional_info: approvedApplication.additional_info || null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', session.user.id)
    
    if (updateError) {
      console.error('Error auto-fixing profile role:', updateError)
    } else {
      // Refresh profile data
      const { data: refreshedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
      if (refreshedProfile) {
        profile = refreshedProfile
      }
    }
  } else if (profile.role !== 'scout' && approvedApplication && recentlyDeniedApplication) {
    console.log('⚠️ Approved application exists but scout status was recently revoked - NOT restoring')
  }

  const { data: userProfile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('user_id', session.user.id)
    .single()

  const meaningfulAvatarUrl = isMeaningfulAvatar(userProfile?.avatar_url)
    ? userProfile?.avatar_url
    : null
  const headerInitialSource =
    profile.full_name?.trim()?.charAt(0) ||
    profile.username?.charAt(0) ||
    session.user.email?.charAt(0) ||
    'G'
  const headerInitial = headerInitialSource.toUpperCase()
  const headerGradient = getGradientForId(profile.id || profile.username || session.user.id)

  const headerContent = (
    <Link href="/profile" className="cursor-pointer hover:opacity-80 transition-opacity">
      <div className="w-10 h-10 rounded-full border-2 border-black p-0.5 overflow-hidden">
        {meaningfulAvatarUrl ? (
          <img
            src={meaningfulAvatarUrl}
            alt="Profile"
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full rounded-full flex items-center justify-center text-white font-semibold ${headerGradient}`}
          >
            {headerInitial}
          </div>
        )}
      </div>
    </Link>
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <DynamicLayout header={headerContent}>
        <ProfileContent profile={profile} hasPendingApplication={!!scoutApplication} />
      </DynamicLayout>
    </div>
  )
}

