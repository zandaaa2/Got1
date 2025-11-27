import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import ScoutApplicationsList from '@/components/admin/ScoutApplicationsList'
import { isAdmin } from '@/lib/admin'
import Link from 'next/link'

// Force dynamic rendering to always show fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0 // Disable caching completely

/**
 * Admin page for reviewing scout applications.
 * Applications appear immediately after submission - no delay.
 */
export default async function ScoutApplicationsPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Check admin access
  const userIsAdmin = await isAdmin(session.user.id)
  
  // Log user ID for admin setup (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('Admin check - User ID:', session.user.id)
    console.log('Admin check - Email:', session.user.email)
  }
  
  if (!userIsAdmin) {
    redirect('/browse')
  }

  // Get all scout applications
  // Note: We can't use foreign key relationship because user_id references auth.users, not profiles
  // So we'll query applications and profiles separately, then join them
  // Use a fresh query each time - no caching
  const { data: applications, error: applicationsError } = await supabase
    .from('scout_applications')
    .select('*')
    .order('created_at', { ascending: false })

  // Log the raw query result for debugging
  console.log('Raw applications from database:', applications?.map(app => ({
    id: app.id,
    status: app.status,
    user_id: app.user_id,
    reviewed_at: app.reviewed_at
  })))

  // Get profiles for all user IDs in applications
  let applicationsWithProfiles = applications || []
  if (applications && applications.length > 0) {
    const userIds = applications.map(app => app.user_id).filter(Boolean)
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, user_id')
        .in('user_id', userIds)

      // Join profiles with applications
      applicationsWithProfiles = applications.map(app => ({
        ...app,
        profile: profiles?.find(p => p.user_id === app.user_id) || null
      }))
    }
  }

  // Log detailed debugging info
  if (applicationsError) {
    console.error('❌ Error fetching scout applications:', applicationsError)
    console.error('Error code:', applicationsError.code)
    console.error('Error message:', applicationsError.message)
    console.error('Error details:', JSON.stringify(applicationsError, null, 2))
    
    // Check if it's an RLS policy error
    if (applicationsError.code === '42501' || applicationsError.message?.includes('policy')) {
      console.error('⚠️  RLS POLICY ERROR: You need to run the SQL script: add-admin-scout-applications-policy.sql')
      console.error('   This will allow admins to view all scout applications')
    }
  } else {
    console.log(`✅ Found ${applicationsWithProfiles?.length || 0} scout applications`)
    if (applicationsWithProfiles && applicationsWithProfiles.length > 0) {
      const statusCounts = {
        pending: applicationsWithProfiles.filter(app => app.status === 'pending').length,
        approved: applicationsWithProfiles.filter(app => app.status === 'approved').length,
        denied: applicationsWithProfiles.filter(app => app.status === 'denied').length,
      }
      console.log('Status breakdown:', statusCounts)
      console.log('Applications:', applicationsWithProfiles.map(app => ({
        id: app.id,
        user_id: app.user_id,
        status: app.status,
        created_at: app.created_at,
        has_profile: !!app.profile
      })))
    }
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-black">Scout Applications</h1>
          <div className="flex gap-3">
            <Link
              href="/admin/scouts"
              className="px-4 py-2 border border-black text-black rounded hover:bg-gray-50 font-medium"
            >
              Manage Scouts
            </Link>
            <Link
              href="/admin/sync-profiles"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium text-sm"
            >
              Sync Profiles
            </Link>
          </div>
        </div>
        {applicationsError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-800 mb-2">Error Loading Applications</h3>
            <p className="text-red-700 text-sm mb-2">{applicationsError.message}</p>
            {applicationsError.code === '42501' || applicationsError.message?.includes('policy') ? (
              <div className="mt-3">
                <p className="text-red-700 font-semibold mb-2">⚠️ RLS Policy Error Detected</p>
                <p className="text-red-700 text-sm">
                  You need to run the SQL script <code className="bg-red-100 px-2 py-1 rounded">add-admin-scout-applications-policy.sql</code> in your Supabase SQL Editor.
                </p>
                <p className="text-red-700 text-sm mt-2">
                  This will allow you to view all scout applications as an admin.
                </p>
              </div>
            ) : null}
          </div>
        )}
        <ScoutApplicationsList applications={applicationsWithProfiles || []} />
      </div>
    </div>
  )
}

