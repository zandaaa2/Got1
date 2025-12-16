import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import PlayerParentFlow from '@/components/playerparent-onboarding/PlayerParentFlow'

export default async function PlayerParentPage({
  searchParams,
}: {
  searchParams: { step?: string }
}) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Get step from URL to check if user is in onboarding
  const step = searchParams.step ? parseInt(searchParams.step, 10) : null
  const isInOnboarding = step !== null && step >= 1 && step <= 7

  // If user is already authenticated and has a profile with role set, 
  // only redirect to profile if they're NOT in the onboarding flow
  // This allows users to complete onboarding even after selecting a role
  if (session && !isInOnboarding) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle()

    // If they already have a role (player, parent, or scout), redirect to profile
    // BUT only if they're not actively in onboarding
    if (profile && profile.role && profile.role !== 'user') {
      redirect('/profile')
    }
  }

  return <PlayerParentFlow initialSession={session} />
}



