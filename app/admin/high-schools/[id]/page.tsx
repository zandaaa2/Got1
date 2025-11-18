import { createServerClient } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-admin'
import Link from 'next/link'
import HighSchoolReview from '@/components/admin/HighSchoolReview'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Admin page for reviewing a specific high school application.
 */
export default async function HighSchoolReviewPage({
  params,
}: {
  params: { id: string }
}) {
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

  // Get school details
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

  const { data: school, error } = await adminSupabase
    .from('high_schools')
    .select(`
      *,
      created_by_user:auth.users!high_schools_created_by_fkey(id),
      reviewed_by_user:auth.users!high_schools_admin_reviewed_by_fkey(id),
      referral_school:high_schools!high_schools_referral_school_id_fkey(id, name, username)
    `)
    .eq('id', params.id)
    .maybeSingle()

  if (error || !school) {
    notFound()
  }

  // Get creator profile
  // Access created_by from the school object (it's included in the * selection)
  const createdBy = (school as any).created_by
  const { data: creatorProfile } = createdBy ? await adminSupabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('user_id', createdBy)
    .maybeSingle() : { data: null }

  // Get admins
  const { data: admins } = await adminSupabase
    .from('high_school_admins')
    .select(`
      user_id,
      profile:profiles!high_school_admins_user_id_fkey(full_name, avatar_url)
    `)
    .eq('high_school_id', params.id)

  // Get player count
  const { data: players } = await adminSupabase
    .from('high_school_players')
    .select('id')
    .eq('high_school_id', params.id)
    .is('released_at', null)

  const schoolWithDetails = {
    ...school,
    creator_profile: creatorProfile,
    admins: admins || [],
    player_count: players?.length || 0,
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/high-schools"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to High School Applications
          </Link>
        </div>

        <HighSchoolReview school={schoolWithDetails} />
      </div>
    </div>
  )
}

