import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import dynamicImport from 'next/dynamic'
import AuthButtons from '@/components/auth/AuthButtons'
import AuthRefreshHandler from '@/components/shared/AuthRefreshHandler'

const BrowseContent = dynamicImport(() => import('@/components/browse/BrowseContent'), {
  ssr: false,
})

export const dynamic = 'force-dynamic'
export const revalidate = 0 // Disable caching completely

export default async function BrowsePage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // CRITICAL: If user is signed in, check if they have required profile fields
  // If not, redirect to user-setup (this is a safety check - middleware should catch this too)
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username, birthday')
      .eq('user_id', session.user.id)
      .maybeSingle()
    
    const hasRequiredFields = profile && 
      profile.full_name && 
      profile.username && 
      profile.birthday
    
    if (!hasRequiredFields) {
      redirect('/profile/user-setup')
    }
  }

  const headerContent = session ? null : <AuthButtons />

  return (
    <div className="min-h-screen bg-white flex">
      <AuthRefreshHandler />
      <Sidebar activePage="browse" />
      <DynamicLayout header={headerContent}>
        <BrowseContent session={session} />
      </DynamicLayout>
    </div>
  )
}

