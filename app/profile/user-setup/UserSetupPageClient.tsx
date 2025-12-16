'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import UserSetupForm from '@/components/profile/UserSetupForm'
import DynamicLayout from '@/components/layout/DynamicLayout'

interface UserSetupPageClientProps {
  userEmail: string
  userName: string
  userAvatar: string
}

export default function UserSetupPageClient({ userEmail, userName, userAvatar }: UserSetupPageClientProps) {
  const router = useRouter()

  useEffect(() => {
    // Check if user is in player/parent onboarding flow
    if (typeof window !== 'undefined') {
      const playerparentOnboarding = localStorage.getItem('playerparent_onboarding')
      if (playerparentOnboarding === 'true') {
        // Redirect to player/parent onboarding
        localStorage.removeItem('playerparent_onboarding')
        // Clear cookie
        document.cookie = 'playerparent_onboarding=; path=/; max-age=0'
        router.replace('/playerparent?step=2')
        return
      }
    }
  }, [router])

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={null}>
        <UserSetupForm
          userEmail={userEmail}
          userName={userName}
          userAvatar={userAvatar}
        />
      </DynamicLayout>
    </div>
  )
}



