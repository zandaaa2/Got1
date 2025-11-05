import { createServerClient } from '@/lib/supabase'

/**
 * Check if a user is an admin.
 * Checks both ADMIN_USER_IDS (user IDs) and ADMIN_EMAILS (email addresses).
 * Primary method is user ID, with email as fallback for flexibility.
 * 
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} - True if the user is an admin, false otherwise
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createServerClient()

  // Primary check: User ID (most reliable, works even if email changes)
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(',').map((id) => id.trim()).filter(Boolean) || []
  if (adminUserIds.includes(userId)) {
    return true
  }

  // Fallback check: Email (for flexibility if user ID isn't set yet)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()).filter(Boolean) || []
    if (user?.email && adminEmails.includes(user.email)) {
      return true
    }
  } catch (error) {
    console.error('Error checking admin email:', error)
  }

  return false
}

