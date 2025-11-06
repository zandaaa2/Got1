import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AccountOwnershipContent from '@/components/profile/AccountOwnershipContent'
import Link from 'next/link'

export default async function AccountOwnershipPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  const { data: userProfile } = await supabase
    .from('profiles')
    .select('avatar_url, full_name, role')
    .eq('user_id', session.user.id)
    .single()

  const headerContent = (
    <Link href="/profile" className="cursor-pointer hover:opacity-80 transition-opacity">
      {userProfile?.avatar_url ? (
        <div className="w-10 h-10 rounded-full border-2 border-black p-0.5">
          <img
            src={userProfile.avatar_url}
            alt="Profile"
            className="w-full h-full rounded-full object-cover"
          />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-full border-2 border-black p-0.5 bg-gray-300 flex items-center justify-center">
          <span className="text-gray-600 font-semibold">
            {userProfile?.role === 'player' ? 'P' : 'S'}
          </span>
        </div>
      )}
    </Link>
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="profile" />
      <DynamicLayout header={headerContent}>
        <AccountOwnershipContent />
      </DynamicLayout>
    </div>
  )
}

