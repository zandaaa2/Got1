import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthRefreshHandler from '@/components/shared/AuthRefreshHandler'
import ProfileRefreshWrapper from '@/components/profile/ProfileRefreshWrapper'
import dynamicImport from 'next/dynamic'

const ProfileContent = dynamicImport(() => import('@/components/profile/ProfileContent'), {
  ssr: false,
})

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

  // Parallelize all initial queries
  const [profileResult, scoutApplicationsResult] = await Promise.all([
    supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
      .maybeSingle(),
    // Fetch all scout applications in one query instead of 3 separate queries
    supabase
      .from('scout_applications')
      .select('*')
      .eq('user_id', session.user.id)
      .in('status', ['pending', 'approved', 'denied'])
  ])

  let { data: profile } = profileResult
  const { data: allScoutApplications } = scoutApplicationsResult

  if (!profile) {
    redirect('/profile/user-setup')
  }

  // Parse scout applications from single query
  const scoutApplication = allScoutApplications?.find(app => app.status === 'pending') || null
  const approvedApplication = allScoutApplications?.find(app => app.status === 'approved') || null
  const recentlyDeniedApplication = allScoutApplications?.find(app => 
    app.status === 'denied' && 
    app.reviewed_at && 
    new Date(app.reviewed_at) > new Date(Date.now() - 3600000)
  ) || null

  // Note: Role is set correctly in ProfileSetupForm (step 3) when user selects player or parent
  // No auto-fix needed based on data fields - role should match what user selected
  
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
  // Only check if we have an approved application
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
        <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading profile...</div>}>
          <ProfileRefreshWrapper>
            <ProfileContent 
              profile={profile} 
              hasPendingApplication={!!scoutApplication}
              pendingScoutApplication={scoutApplication || null}
              needsReferrerSelection={needsReferrerSelection}
            />
          </ProfileRefreshWrapper>
        </Suspense>
      </DynamicLayout>
    </div>
  )
}
