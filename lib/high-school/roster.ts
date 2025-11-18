import { createClient } from '@/lib/supabase-client'

/**
 * Checks if a player is currently on a high school roster
 * (has accepted request or has joined_at, and not released)
 * 
 * @param userId - The user ID of the player to check
 * @returns Promise<{ isOnRoster: boolean; schoolId: string | null }>
 */
export async function checkPlayerRosterStatus(userId: string): Promise<{
  isOnRoster: boolean
  schoolId: string | null
}> {
  const supabase = createClient()
  
  const { data } = await supabase
    .from('high_school_players')
    .select('high_school_id, released_at, request_status, joined_at')
    .eq('user_id', userId)
    .is('released_at', null)
    .or('request_status.eq.accepted,joined_at.not.is.null')
    .maybeSingle()
  
  if (data) {
    return {
      isOnRoster: true,
      schoolId: data.high_school_id,
    }
  }
  
  return {
    isOnRoster: false,
    schoolId: null,
  }
}

