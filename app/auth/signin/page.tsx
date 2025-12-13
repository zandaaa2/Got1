import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import AuthForm from '@/components/auth/AuthForm'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { error?: string; redirect?: string }
}) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    // Check for redirect parameter first, then check for scout onboarding flag
    // This handles cases where OAuth completes but redirect param wasn't preserved
    let redirectTo = searchParams.redirect
    
    // If no redirect param, check if user should go to scout onboarding
    // Note: We can't check localStorage server-side, so we'll let the client handle it
    if (!redirectTo) {
      redirectTo = '/browse'
    }
    
    redirect(redirectTo)
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md w-full p-8">
        <h2 className="text-3xl font-bold text-black mb-8">Sign In</h2>
        <AuthForm mode="signin" redirectParam={searchParams.redirect} />
      </div>
    </div>
  )
}

