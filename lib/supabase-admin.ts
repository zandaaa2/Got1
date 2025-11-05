import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client with service role key for admin operations.
 * This allows access to user emails and other admin-only operations.
 * Falls back to null if service role key is not configured.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return null
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Gets a user's email by their user ID using the admin client.
 * Returns null if admin client is not available or user is not found.
 * 
 * @param userId - The user's ID from auth.users
 * @returns The user's email or null
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const adminClient = createAdminClient()
  
  if (!adminClient) {
    return null
  }

  try {
    const { data: { user }, error } = await adminClient.auth.admin.getUserById(userId)
    
    if (error || !user) {
      console.error('Error fetching user email:', error)
      return null
    }

    return user.email || null
  } catch (error) {
    console.error('Error in getUserEmail:', error)
    return null
  }
}

