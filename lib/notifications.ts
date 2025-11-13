import { createAdminClient } from './supabase-admin'

interface CreateNotificationParams {
  userId: string
  type: string
  title: string
  message: string
  link?: string
  metadata?: Record<string, any>
}

/**
 * Creates a notification for a user.
 * Uses admin client to bypass RLS policies.
 * 
 * @param params - Notification parameters
 * @returns true if notification was created successfully, false otherwise
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  metadata,
}: CreateNotificationParams) {
  try {
    const supabase = createAdminClient()
    if (!supabase) {
      console.error('Admin client not available')
      return false
    }

    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      link: link || null,
      metadata: metadata || null,
    })

    if (error) {
      console.error('Error creating notification:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error creating notification:', error)
    return false
  }
}

