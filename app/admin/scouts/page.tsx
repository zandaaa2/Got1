import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import ScoutsManagementList from '@/components/admin/ScoutsManagementList'
import Link from 'next/link'

/**
 * Admin page for managing active scouts - revoke scout status and suspend scouts.
 */
export default async function ScoutsManagementPage() {
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

  // Get all active scouts (role = 'scout')
  const { data: scouts } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'scout')
    .order('full_name', { ascending: true })

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-black">Manage Scouts</h1>
          <Link
            href="/admin/scout-applications"
            className="px-4 py-2 border border-black text-black rounded hover:bg-gray-50 font-medium"
          >
            View Applications
          </Link>
        </div>
        <ScoutsManagementList scouts={scouts || []} />
      </div>
    </div>
  )
}

