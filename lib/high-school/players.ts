import { createServerClient } from '@/lib/supabase'
import { createAdminClient } from '@/lib/supabase-admin'
import { validatePositions } from './positions'
import { sendRosterInviteEmail } from '@/lib/email/high-school-invite'
import { createNotification } from '@/lib/notifications'

/**
 * Add a player to the roster
 */
export async function addPlayerToRoster(
  schoolId: string,
  playerData: {
    name: string
    positions: string[]
    email?: string | null
    username?: string
    user_id?: string
    graduation_month?: string | null
    graduation_year?: number | null
    jersey_number?: string | null
  },
  addedBy: string
): Promise<{ success: boolean; playerId?: string; error?: string }> {
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return { success: false, error: 'Admin client not available' }
  }
  
  // Validate positions
  const positionValidation = validatePositions(playerData.positions)
  if (!positionValidation.valid) {
    return { success: false, error: positionValidation.error }
  }
  
  // Determine if linking to existing user
  let userId: string | null = playerData.user_id || null
  if (!userId && playerData.username) {
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('user_id')
      .eq('username', playerData.username)
      .maybeSingle()
    
    if (profile) {
      userId = profile.user_id
    }
  }
  
  // If user_id exists, create a REQUEST instead of immediate add
  if (userId) {
    // Resolve email (optional for requests - we'll use placeholder if needed)
    let resolvedEmail = playerData.email?.toLowerCase()?.trim() || null
    if (!resolvedEmail) {
      try {
        const { data } = await adminSupabase.auth.admin.getUserById(userId)
        resolvedEmail = data.user?.email?.toLowerCase() || null
      } catch (error) {
        console.error('Failed to fetch user email for roster invite', error)
      }
    }
    
    // Use placeholder email if we can't resolve it (for requests, email is less critical)
    if (!resolvedEmail) {
      resolvedEmail = `${userId.substring(0, 8)}@got1.app` // Placeholder for requests
    }
    // Check if request already exists
    const { data: existingRequest } = await adminSupabase
      .from('high_school_players')
      .select('id, request_status, joined_at')
      .eq('high_school_id', schoolId)
      .eq('user_id', userId)
      .maybeSingle()
    
    if (existingRequest) {
      if (existingRequest.request_status === 'pending') {
        return { success: false, error: 'A request is already pending for this player' }
      }
      if (existingRequest.request_status === 'accepted' || existingRequest.joined_at) {
        return { success: false, error: 'This player is already on the roster' }
      }
    }
    
    // Get school name for notification
    const { data: school } = await adminSupabase
      .from('high_schools')
      .select('name, username')
      .eq('id', schoolId)
      .maybeSingle()
    
    // Insert as a REQUEST (not immediate add)
    const { data: player, error } = await adminSupabase
      .from('high_school_players')
      .insert({
        high_school_id: schoolId,
        user_id: userId,
        name: playerData.name,
        positions: playerData.positions,
        email: resolvedEmail,
        username: playerData.username || null,
        graduation_month: playerData.graduation_month || null,
        graduation_year: playerData.graduation_year || null,
        jersey_number: playerData.jersey_number || null,
        request_status: 'pending',
        requested_at: new Date().toISOString(),
        added_by: addedBy,
      })
      .select()
      .single()
    
    if (error || !player) {
      return { success: false, error: error?.message || 'Failed to create roster request' }
    }
    
    // Send notification to player to accept/deny
    await createNotification({
      userId,
      type: 'school_roster_request',
      title: 'Roster Join Request',
      message: `${school?.name || 'A high school'} has requested you to join their roster.`,
      link: `/notifications`,
      metadata: {
        school_id: schoolId,
        player_id: player.id,
        requested_by: addedBy,
      },
    })
    
    return { success: true, playerId: player.id, isRequest: true }
  }

  // For non-existing users, email is required
  // Resolve email
  let resolvedEmail = playerData.email?.toLowerCase()?.trim() || null
  if (!resolvedEmail) {
    return { success: false, error: 'A valid email is required to add this player' }
  }

  // For non-existing users, send email invite (existing logic)
  const inviteToken = crypto.randomUUID()
  
  // Insert player record
  const { data: player, error } = await adminSupabase
    .from('high_school_players')
    .insert({
      high_school_id: schoolId,
      user_id: null,
      name: playerData.name,
      positions: playerData.positions,
      email: resolvedEmail,
      username: playerData.username || null,
      graduation_month: playerData.graduation_month || null,
      graduation_year: playerData.graduation_year || null,
      jersey_number: playerData.jersey_number || null,
      invite_token: inviteToken,
      added_by: addedBy,
    })
    .select()
    .single()
  
  if (error || !player) {
    return { success: false, error: error?.message || 'Failed to add player' }
  }
  
  // Send email invite
  await sendRosterInviteEmail({
    email: resolvedEmail,
    schoolName: '', // Will be fetched in the email function
    schoolId,
    inviteToken: inviteToken,
    playerName: playerData.name,
  })
  
  // Update invite_sent_at
  await adminSupabase
    .from('high_school_players')
    .update({ invite_sent_at: new Date().toISOString() })
    .eq('id', player.id)
  
  return { success: true, playerId: player.id }
}

/**
 * Link a player to a school (when they accept invite or join)
 */
export async function linkPlayerToSchool(
  userId: string,
  schoolId: string,
  inviteToken: string | null
): Promise<{ success: boolean; error?: string }> {
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return { success: false, error: 'Admin client not available' }
  }
  
  // Fetch the user's email from their auth account
  let userEmail: string | null = null
  try {
    const { data } = await adminSupabase.auth.admin.getUserById(userId)
    userEmail = data.user?.email?.toLowerCase() || null
  } catch (error) {
    console.error('Failed to fetch user email when linking player to school', error)
  }
  
  // Update player record
  const updateData: any = {
    user_id: userId,
    joined_at: new Date().toISOString(),
  }
  
  // If we have the user's email, update it to match their actual account
  if (userEmail) {
    updateData.email = userEmail
  }
  
  // If invite token provided, verify it
  if (inviteToken) {
    const { data: playerRecord } = await adminSupabase
      .from('high_school_players')
      .select('id, user_id, high_school_id')
      .eq('invite_token', inviteToken)
      .is('user_id', null)
      .maybeSingle()
    
    if (!playerRecord) {
      return { success: false, error: 'Invalid or expired invite token' }
    }
    
    if (playerRecord.high_school_id !== schoolId) {
      return { success: false, error: 'Invite token does not match school' }
    }
    
    updateData.id = playerRecord.id
  } else {
    // Find by school and user
    const { data: playerRecord } = await adminSupabase
      .from('high_school_players')
      .select('id')
      .eq('high_school_id', schoolId)
      .eq('user_id', userId)
      .maybeSingle()
    
    if (!playerRecord) {
      return { success: false, error: 'Player record not found' }
    }
    
    updateData.id = playerRecord.id
  }
  
  const { error: updateError } = await adminSupabase
    .from('high_school_players')
    .update(updateData)
    .eq('id', updateData.id)
  
  if (updateError) {
    return { success: false, error: updateError.message }
  }
  
  // Update profile
  const { error: profileError } = await adminSupabase
    .from('profiles')
    .update({ high_school_id: schoolId })
    .eq('user_id', userId)
  
  if (profileError) {
    console.error('Error updating profile:', profileError)
    // Don't fail the whole operation if profile update fails
  }
  
  return { success: true }
}

/**
 * Release a player from a school
 */
export async function releasePlayer(
  playerId: string,
  schoolId: string,
  releasedBy: string
): Promise<{ success: boolean; error?: string }> {
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return { success: false, error: 'Admin client not available' }
  }
  
  // Get player record
  const { data: player, error: fetchError } = await adminSupabase
    .from('high_school_players')
    .select('user_id')
    .eq('id', playerId)
    .eq('high_school_id', schoolId)
    .maybeSingle()
  
  if (fetchError || !player) {
    return { success: false, error: 'Player not found' }
  }
  
  if (!player.user_id) {
    // Pending invite - just remove the row entirely
    const { error: deleteError } = await adminSupabase
      .from('high_school_players')
      .delete()
      .eq('id', playerId)
      .eq('high_school_id', schoolId)
    
    if (deleteError) {
      return { success: false, error: deleteError.message }
    }
  } else {
    // Confirmed player - mark as released
    const { error: updateError } = await adminSupabase
      .from('high_school_players')
      .update({
        released_at: new Date().toISOString(),
        release_requested_at: null,
      })
      .eq('id', playerId)
    
    if (updateError) {
      return { success: false, error: updateError.message }
    }
    
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({ high_school_id: null })
      .eq('user_id', player.user_id)
      .eq('high_school_id', schoolId)
    
    if (profileError) {
      console.error('Error updating profile:', profileError)
    }
  }
  
  return { success: true }
}

/**
 * Request release (player-initiated)
 */
export async function requestRelease(
  userId: string,
  schoolId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient()
  
  // Find player record
  const { data: player, error } = await supabase
    .from('high_school_players')
    .select('id, release_requested_at')
    .eq('user_id', userId)
    .eq('high_school_id', schoolId)
    .is('released_at', null)
    .maybeSingle()
  
  if (error || !player) {
    return { success: false, error: 'Player record not found' }
  }
  
  if (player.release_requested_at) {
    return { success: false, error: 'Release already requested' }
  }
  
  // Set release_requested_at
  const { error: updateError } = await supabase
    .from('high_school_players')
    .update({ release_requested_at: new Date().toISOString() })
    .eq('id', player.id)
  
  if (updateError) {
    return { success: false, error: updateError.message }
  }
  
  // Send notification to admins
  const { data: admins } = await supabase
    .from('high_school_admins')
    .select('user_id')
    .eq('high_school_id', schoolId)
  
  if (admins) {
    for (const admin of admins) {
      await createNotification({
        userId: admin.user_id,
        type: 'player_release_request',
        title: 'Player Release Request',
        message: 'A player has requested to be released from the school roster.',
        link: `/high-school/${schoolId}/roster`,
        metadata: {
          school_id: schoolId,
          player_id: userId,
          player_record_id: player.id,
        },
      })
    }
  }
  
  return { success: true }
}

