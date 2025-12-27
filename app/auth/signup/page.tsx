import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import AuthForm from '@/components/auth/AuthForm'
import Logo from '@/components/shared/Logo'

export default async function SignUpPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect('/browse')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col">
      {/* Header with Logo */}
      <div className="w-full px-6 py-6 md:px-8 md:py-8">
        <Logo variant="regular" size="md" linkToHome={true} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {/* Card Container */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 md:p-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-black mb-3">
                Create Your Account
              </h1>
              <p className="text-gray-600 text-base">
                Get started with Got1 today
              </p>
            </div>

        <AuthForm mode="signup" />

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <a 
                  href="/auth/signin" 
                  className="text-black font-medium hover:underline"
                >
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

