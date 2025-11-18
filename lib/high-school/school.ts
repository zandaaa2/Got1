import { createServerClient } from '@/lib/supabase'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Check if a user is an admin of a specific high school
 */
export async function isHighSchoolAdmin(
  userId: string,
  schoolId: string
): Promise<boolean> {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('high_school_admins')
    .select('id')
    .eq('high_school_id', schoolId)
    .eq('user_id', userId)
    .maybeSingle()
  
  if (error) {
    console.error('Error checking high school admin:', error)
    return false
  }
  
  return !!data
}

/**
 * Get the high school a user is an admin of
 */
export async function getUserHighSchool(userId: string): Promise<{
  id: string
  username: string
  name: string
  admin_status: string
} | null> {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('high_school_admins')
    .select(`
      high_school_id,
      schools:high_schools (
        id,
        username,
        name,
        admin_status
      )
    `)
    .eq('user_id', userId)
    .maybeSingle()
  
  if (error || !data || !data.schools) {
    return null
  }
  
  return {
    id: data.schools.id,
    username: data.schools.username,
    name: data.schools.name,
    admin_status: data.schools.admin_status,
  }
}

/**
 * Get all high schools a user is an admin of (should only be 1, but handle multiple)
 */
export async function getUserHighSchools(userId: string) {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('high_school_admins')
    .select(`
      high_school_id,
      schools:high_schools (
        id,
        username,
        name,
        admin_status
      )
    `)
    .eq('user_id', userId)
  
  if (error || !data) {
    return []
  }
  
  return data
    .filter((item: any) => item.schools)
    .map((item: any) => ({
      id: item.schools.id,
      username: item.schools.username,
      name: item.schools.name,
      admin_status: item.schools.admin_status,
    }))
}

/**
 * Check if user can join a school (not already locked to another)
 */
export async function canUserJoinSchool(
  userId: string,
  schoolId: string
): Promise<{ canJoin: boolean; reason?: string }> {
  const supabase = createServerClient()
  
  // Check if user is already locked to a different school
  const { data: profile } = await supabase
    .from('profiles')
    .select('high_school_id')
    .eq('user_id', userId)
    .maybeSingle()
  
  if (profile?.high_school_id && profile.high_school_id !== schoolId) {
    return {
      canJoin: false,
      reason: 'You are already part of another high school',
    }
  }
  
  // Check if user is already in this school's roster
  const { data: existingPlayer } = await supabase
    .from('high_school_players')
    .select('id, released_at')
    .eq('high_school_id', schoolId)
    .eq('user_id', userId)
    .maybeSingle()
  
  if (existingPlayer) {
    if (!existingPlayer.released_at) {
      return {
        canJoin: false,
        reason: 'You are already in this school\'s roster',
      }
    }
    // If released, they can rejoin
    return { canJoin: true }
  }
  
  return { canJoin: true }
}

/**
 * Check if player is locked to a school (not released)
 */
export async function isPlayerLockedToSchool(userId: string): Promise<{
  locked: boolean
  schoolId?: string
  schoolName?: string
}> {
  const supabase = createServerClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('high_school_id')
    .eq('user_id', userId)
    .maybeSingle()
  
  if (!profile?.high_school_id) {
    return { locked: false }
  }
  
  // Check if player is released
  const { data: playerRecord } = await supabase
    .from('high_school_players')
    .select(`
      high_school_id,
      released_at,
      schools:high_schools (
        name
      )
    `)
    .eq('user_id', userId)
    .eq('high_school_id', profile.high_school_id)
    .maybeSingle()
  
  if (!playerRecord) {
    return { locked: false }
  }
  
  if (playerRecord.released_at) {
    return { locked: false }
  }
  
  return {
    locked: true,
    schoolId: playerRecord.high_school_id,
    schoolName: (playerRecord.schools as any)?.name,
  }
}

// isReferralFeatureActive moved to lib/high-school/utils.ts to avoid server-only imports in client components

/**
 * Get school by username
 */
export async function getSchoolByUsername(username: string) {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('high_schools')
    .select('*')
    .eq('username', username)
    .eq('admin_status', 'approved')
    .maybeSingle()
  
  if (error) {
    console.error('Error fetching school by username:', error)
    return null
  }
  
  return data
}

/**
 * Check if username is available
 * Usernames must be unique across both high_schools and profiles tables
 * Username is normalized to lowercase for case-insensitive comparison
 */
export async function isUsernameAvailable(username: string, excludeId?: string): Promise<boolean> {
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    console.error('Admin Supabase client not available')
    return false
  }
  
  // Normalize username to lowercase for case-insensitive comparison
  const normalizedUsername = username.toLowerCase().trim()
  
  if (!normalizedUsername) {
    return false
  }
  
  // Check high_schools table (case-insensitive using LOWER)
  let schoolQuery = adminSupabase
    .from('high_schools')
    .select('id')
    .ilike('username', normalizedUsername) // Case-insensitive comparison
  
  if (excludeId) {
    schoolQuery = schoolQuery.neq('id', excludeId)
  }
  
  const { data: schoolData, error: schoolError } = await schoolQuery.maybeSingle()
  
  if (schoolError) {
    console.error('Error checking username availability in high_schools:', schoolError)
    // If it's an RLS recursion error, we should still try to proceed
    // but log it for debugging
    if (schoolError.code === '42P17') {
      console.warn('RLS recursion error detected - this should be fixed with the SQL migration')
    }
    // Return false on error to be safe (assume taken if we can't check)
    return false
  }
  
  // If username exists in high_schools, it's not available
  if (schoolData) {
    return false
  }
  
  // Check profiles table (case-insensitive using LOWER)
  const { data: profileData, error: profileError } = await adminSupabase
    .from('profiles')
    .select('id')
    .ilike('username', normalizedUsername) // Case-insensitive comparison
    .maybeSingle()
  
  if (profileError) {
    console.error('Error checking username availability in profiles:', profileError)
    // Return false on error to be safe (assume taken if we can't check)
    return false
  }
  
  // If username exists in profiles, it's not available
  if (profileData) {
    return false
  }
  
  // Username is available if it doesn't exist in either table
  return true
}

