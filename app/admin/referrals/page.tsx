import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import ReferralApplicationsList from '@/components/admin/ReferralApplicationsList'
import Link from 'next/link'

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

  // Get all referral applications
  const { data: applications, error: applicationsError } = await supabase
    .from('referral_program_applications')
    .select('*')
    .order('created_at', { ascending: false })

  // Get profiles for all user IDs in applications
  let applicationsWithProfiles = applications || []
  if (applications && applications.length > 0) {
    const userIds = applications.map(app => app.user_id).filter(Boolean)
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
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
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-black">Referral Program Applications</h1>
          <div className="flex gap-3">
            <Link
              href="/admin/scouts"
              className="px-4 py-2 border border-black text-black rounded hover:bg-gray-50 font-medium"
            >
              Manage Scouts
            </Link>
            <Link
              href="/admin/scout-applications"
              className="px-4 py-2 border border-black text-black rounded hover:bg-gray-50 font-medium"
            >
              Scout Applications
            </Link>
          </div>
        </div>
        {applicationsError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-800 mb-2">Error Loading Applications</h3>
            <p className="text-red-700 text-sm">{applicationsError.message}</p>
          </div>
        )}
        <ReferralApplicationsList applications={applicationsWithProfiles || []} />
      </div>
    </div>
  )
}

