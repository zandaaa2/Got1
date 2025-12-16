import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthRefreshHandler from '@/components/shared/AuthRefreshHandler'
import ProfileContent from '@/components/profile/ProfileContent'

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
    .maybeSingle()

  if (!profile) {
    redirect('/profile/user-setup')
  }

  // Auto-fix: If role is 'user' but profile has player or parent data, update role accordingly
  // This handles cases where the role update in step 3 didn't persist
  if (profile.role === 'user') {
    // Check if user has parent_children links (indicates they're a parent)
    const { data: parentLinks } = await supabase
      .from('parent_children')
      .select('id')
      .eq('parent_id', session.user.id)
      .limit(1)
    
    if (parentLinks && parentLinks.length > 0) {
      // User has linked children, they should be a parent
      console.log('⚠️ ProfilePage - Auto-fixing role from "user" to "parent" (has linked children)')
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'parent' })
        .eq('user_id', session.user.id)
        .select()
        .single()
      
      if (updateError) {
        console.error('❌ ProfilePage - Error auto-fixing role to parent:', updateError)
      } else if (updatedProfile) {
        console.log('✅ ProfilePage - Role auto-fixed to:', updatedProfile.role)
        profile = updatedProfile
      }
    } else if (profile.hudl_link || profile.position || profile.school) {
      // User has player data, they should be a player
      console.log('⚠️ ProfilePage - Auto-fixing role from "user" to "player" (has player data)')
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'player' })
        .eq('user_id', session.user.id)
        .select()
        .single()
      
      if (updateError) {
        console.error('❌ ProfilePage - Error auto-fixing role to player:', updateError)
      } else if (updatedProfile) {
        console.log('✅ ProfilePage - Role auto-fixed to:', updatedProfile.role)
        profile = updatedProfile
      }
    }
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
        social_link: approvedApplication.social_link || null,
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

  // Check if scout needs to select a referrer (for display in profile, not redirect)
  let needsReferrerSelection = false
  if (profile.role === 'scout' && approvedApplication) {
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', session.user.id)
      .maybeSingle()

    if (!existingReferral) {
      const recentlyApproved = approvedApplication.reviewed_at && 
        new Date(approvedApplication.reviewed_at) > new Date(Date.now() - 24 * 3600000)
      
      if (recentlyApproved) {
        needsReferrerSelection = true
      }
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      <AuthRefreshHandler />
      <Sidebar />
      <DynamicLayout header={null}>
        <ProfileContent 
          profile={profile} 
          hasPendingApplication={!!scoutApplication}
          pendingScoutApplication={scoutApplication || null}
          needsReferrerSelection={needsReferrerSelection}
        />
      </DynamicLayout>
    </div>
  )
}

