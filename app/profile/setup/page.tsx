import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export default async function ProfileSetupPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if profile already exists (use maybeSingle to avoid errors)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  // Redirect to new user-setup flow
  if (profile) {
    redirect('/profile')
  } else {
    redirect('/profile/user-setup')
  }

  // This code is unreachable but needed for TypeScript
  return null
}

