import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import AuthForm from '@/components/auth/AuthForm'

export default async function SignUpPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect('/browse')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md w-full p-8">
        <h2 className="text-3xl font-bold text-black mb-8">Sign Up</h2>
        <AuthForm mode="signup" />
      </div>
    </div>
  )
}

