import { createServerClient } from '@/lib/supabase'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import ReferralApplicationsList from '@/components/admin/ReferralApplicationsList'
import AdminReferralNav from '@/components/admin/AdminReferralNav'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Admin page for reviewing referral program applications
 */
export default async function ReferralsAdminPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Check admin access
  const userIsAdmin = await isAdmin(session.user.id)
  if (!userIsAdmin) {
    redirect('/browse')
  }

  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    throw new Error('Supabase admin client is not configured')
  }

  // Get all referral applications (admin client bypasses RLS)
  const { data: applications, error: applicationsError } = await adminSupabase
    .from('referral_program_applications')
    .select('*')
    .order('created_at', { ascending: false })

  // Get profiles for all user IDs in applications
  let applicationsWithProfiles = applications || []
  if (applications && applications.length > 0) {
    const userIds = applications.map(app => app.user_id).filter(Boolean)
    if (userIds.length > 0) {
      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, full_name, avatar_url, user_id, username')
        .in('user_id', userIds)

      // Join profiles with applications
      applicationsWithProfiles = applications.map(app => ({
        ...app,
        profile: profiles?.find(p => p.user_id === app.user_id) || null
      }))
    }
  }

  return (
    <div className="min-h-screen bg-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-black">Referral Program Applications</h1>
          <AdminReferralNav active="applications" />
        </div>
        {applicationsError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <h3 className="font-bold text-red-800 mb-2">Error Loading Applications</h3>
            <p className="text-red-700 text-sm">{applicationsError.message}</p>
          </div>
        )}
        <ReferralApplicationsList applications={applicationsWithProfiles || []} />
      </div>
    </div>
  )
}

