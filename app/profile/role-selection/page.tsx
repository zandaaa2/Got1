'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Sidebar from '@/components/layout/Sidebar'
import PageContent from '@/components/layout/PageContent'
import RoleSelectionModal from '@/components/profile/RoleSelectionModal'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'

export default function RoleSelectionPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const checkProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/signin')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!profileData || profileData.role !== 'user') {
        // If no profile or already has player/scout role, redirect
        router.push('/profile')
        return
      }

      setProfile(profileData)
      setLoading(false)
      setIsModalOpen(true)
    }

    checkProfile()
  }, [router, supabase])

  const handleRoleSelection = async (role: 'player' | 'scout' | 'skip') => {
    if (role === 'skip') {
      router.push('/profile')
      return
    }

    // Redirect to appropriate setup page
    if (role === 'player') {
      router.push('/profile/player-setup')
    } else if (role === 'scout') {
      router.push('/profile/scout-setup')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <PageContent>
        <div className="max-w-2xl mx-auto py-12">
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-4">
            Choose Your Path
          </h1>
          <p className="text-gray-600 mb-8">
            Select how you'd like to use Got1. You can always change this later.
          </p>
        </div>
      </PageContent>
      <RoleSelectionModal
        isOpen={isModalOpen}
        onClose={() => {
          // Don't allow closing - they must make a selection
        }}
        onSelect={handleRoleSelection}
      />
    </div>
  )
}

