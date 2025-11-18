import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Admin page for reviewing high school applications.
 */
export default async function HighSchoolsPage() {
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

  // Get all high schools
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-800 mb-2">Server Configuration Error</h3>
            <p className="text-red-700 text-sm">Admin client not available. Check SUPABASE_SERVICE_ROLE_KEY in environment variables.</p>
          </div>
        </div>
      </div>
    )
  }

  const { data: schools, error } = await adminSupabase
    .from('high_schools')
    .select(`
      *,
      created_by_user:auth.users!high_schools_created_by_fkey(id),
      reviewed_by_user:auth.users!high_schools_admin_reviewed_by_fkey(id)
    `)
    .order('created_at', { ascending: false })

  // Get profiles for created_by users
  let schoolsWithProfiles = schools || []
  if (schools && schools.length > 0) {
    const userIds = schools
      .map((s: any) => s.created_by)
      .filter(Boolean)
      .filter((id: string, index: number, self: string[]) => self.indexOf(id) === index)

    if (userIds.length > 0) {
      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds)

      schoolsWithProfiles = schools.map((school: any) => ({
        ...school,
        creator_profile: profiles?.find((p) => p.user_id === school.created_by) || null,
      }))
    }
  }

  const pendingCount = schools?.filter((s: any) => s.admin_status === 'pending').length || 0
  const approvedCount = schools?.filter((s: any) => s.admin_status === 'approved').length || 0
  const deniedCount = schools?.filter((s: any) => s.admin_status === 'denied').length || 0

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-black">High School Applications</h1>
          <div className="flex gap-3">
            <Link
              href="/admin/scout-applications"
              className="px-4 py-2 border border-black text-black rounded hover:bg-gray-50 font-medium"
            >
              Scout Applications
            </Link>
            <Link
              href="/admin/scouts"
              className="px-4 py-2 border border-black text-black rounded hover:bg-gray-50 font-medium"
            >
              Manage Scouts
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-800 mb-2">Error Loading Schools</h3>
            <p className="text-red-700 text-sm">{error.message}</p>
          </div>
        )}

        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-2xl font-bold text-yellow-800">{pendingCount}</div>
            <div className="text-sm text-yellow-700">Pending Review</div>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-2xl font-bold text-green-800">{approvedCount}</div>
            <div className="text-sm text-green-700">Approved</div>
          </div>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-2xl font-bold text-red-800">{deniedCount}</div>
            <div className="text-sm text-red-700">Denied</div>
          </div>
        </div>

        {/* Schools List */}
        <div className="space-y-4">
          {schoolsWithProfiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No high school applications found.
            </div>
          ) : (
            schoolsWithProfiles.map((school: any) => (
              <Link
                key={school.id}
                href={`/admin/high-schools/${school.id}`}
                className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-black">{school.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          school.admin_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : school.admin_status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {school.admin_status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Username: <span className="font-mono">{school.username}</span>
                    </p>
                    {school.address && (
                      <p className="text-sm text-gray-600 mb-2">{school.address}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      Created by: {school.creator_profile?.full_name || 'Unknown'}
                    </p>
                    {school.admin_reviewed_at && (
                      <p className="text-sm text-gray-500">
                        Reviewed: {new Date(school.admin_reviewed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-blue-600">View Details →</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}


