import { createServerClient } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import ScoutApplicationReview from '@/components/admin/ScoutApplicationReview'
import Link from 'next/link'
import { isAdmin } from '@/lib/admin'

export default async function ScoutApplicationReviewPage({
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

  // Get the application
  const { data: application, error: applicationError } = await supabase
    .from('scout_applications')
    .select('*')
    .eq('id', params.id)
    .single()

  if (applicationError || !application) {
    console.error('Error fetching application:', applicationError)
    notFound()
  }

  // Get the profile for this application's user_id
  let applicationWithProfile = application
  if (application.user_id) {
    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', application.user_id)
      .single()

    applicationWithProfile = {
      ...application,
      profile: profile || null
    }
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/admin/scout-applications"
          className="inline-flex items-center gap-2 text-black hover:opacity-70 mb-6"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Applications
        </Link>
        <ScoutApplicationReview application={applicationWithProfile} />
      </div>
    </div>
  )
}

