import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import BecomeAScoutFlow from '@/components/scout-onboarding/BecomeAScoutFlow'

export default async function ScoutPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if user is already a scout or has pending/approved application
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (profile?.role === 'scout') {
      redirect('/profile')
    }

    // Check for existing application
    const { data: application } = await supabase
      .from('scout_applications')
      .select('status')
      .eq('user_id', session.user.id)
      .in('status', ['pending', 'approved'])
      .maybeSingle()

    if (application) {
      redirect('/profile')
    }
  }

  return <BecomeAScoutFlow initialSession={session} />
}

