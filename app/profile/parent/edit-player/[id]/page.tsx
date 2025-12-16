import { createServerClient } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ProfileEditForm from '@/components/profile/ProfileEditForm'
import DynamicLayout from '@/components/layout/DynamicLayout'
import PlayerDeleteUnlinkButtons from '@/components/profile/PlayerDeleteUnlinkButtons'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ParentEditPlayerPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Get parent profile - must be a parent
  const { data: parentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!parentProfile || parentProfile.role !== 'parent') {
    redirect('/profile')
  }

  // Get the player profile by ID
  const { data: playerProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (!playerProfile) {
    notFound()
  }

  // Verify the parent is linked to this player via parent_children
  const { data: parentLink } = await supabase
    .from('parent_children')
    .select('id')
    .eq('parent_id', session.user.id)
    .eq('player_id', playerProfile.user_id)
    .maybeSingle()

  if (!parentLink) {
    // Parent is not authorized to edit this player
    redirect('/profile')
  }

  // Check if profile has been saved for the first time
  const profileCreatedAt = new Date(playerProfile.created_at)
  const profileUpdatedAt = new Date(playerProfile.updated_at)
  const timeDiff = Math.abs(profileUpdatedAt.getTime() - profileCreatedAt.getTime())
  const isNewProfile = timeDiff < 5000

  // Check if player was created by parent (has system email pattern)
  // We'll check this on the client side using the API endpoint
  const isCreatedByParent = playerProfile.username?.startsWith('player-') || false

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <DynamicLayout header={null}>
        <div className="max-w-4xl mx-auto py-8">
          <div className="mb-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
              Edit {playerProfile.full_name || 'Player'}'s Profile
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Update your child's profile information. Changes will only affect this player's profile.
            </p>
          </div>
          <div className="px-4 sm:px-6 lg:px-8">
            <ProfileEditForm 
              profile={playerProfile} 
              isNewProfile={isNewProfile}
              pendingScoutApplication={null}
            />
            <PlayerDeleteUnlinkButtons
              playerId={playerProfile.id}
              playerUserId={playerProfile.user_id}
              isCreatedByParent={isCreatedByParent}
            />
          </div>
        </div>
      </DynamicLayout>
    </div>
  )
}
