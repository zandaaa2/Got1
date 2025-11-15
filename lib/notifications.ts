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
 * For certain notification types (like user_signed_in, user_signed_up), 
 * prevents duplicates by checking for recent notifications of the same type.
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

    // For auth-related notifications, use the database function for atomic check-and-insert
    // This prevents race conditions where multiple components try to create the same notification
    const duplicateCheckTypes: string[] = ['user_signed_in', 'user_signed_up']
    if (duplicateCheckTypes.includes(type)) {
      try {
        const { data: notificationId, error: rpcError } = await supabase.rpc(
          'create_notification_if_not_exists',
          {
            p_user_id: userId,
            p_type: type,
            p_title: title,
            p_message: message,
            p_link: link || null,
            p_metadata: metadata || null,
            p_duplicate_window_seconds: 30,
          }
        )

        if (rpcError) {
          // If RPC function doesn't exist yet, fall back to manual check
          if (rpcError.code === '42883' || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
            console.warn('RPC function not available, falling back to manual check:', rpcError.message)
            // Fall through to manual check below
          } else {
            console.error('Error creating notification via RPC:', rpcError)
            return false
          }
        } else if (notificationId) {
          // Function returned an ID - either created a new notification or found an existing one
          // In both cases, we've successfully handled the request (no duplicate created)
          console.log(`✅ ${type} notification handled via RPC (ID: ${notificationId})`)
          return true
        }
      } catch (rpcError) {
        console.warn('RPC call failed, falling back to manual check:', rpcError)
        // Fall through to manual check below
      }
    }

    // Fallback: Manual check for non-auth notifications or if RPC fails
    // Also check for scout_ready_to_earn (should only be created once EVER)
    const duplicateCheckTypesManual: string[] = ['user_signed_in', 'user_signed_up', 'scout_ready_to_earn']
    if (duplicateCheckTypesManual.includes(type)) {
      // For scout_ready_to_earn, check if one exists EVER (not just recent)
      // For auth notifications, check for recent ones only
      if (type === 'scout_ready_to_earn') {
        // Check if ANY scout_ready_to_earn notification exists (ever) - should only be created once
        const { data: existingNotification, error: checkError } = await supabase
          .from('notifications')
          .select('id, created_at')
          .eq('user_id', userId)
          .eq('type', type)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (checkError) {
          console.error('Error checking for duplicate scout_ready_to_earn notification:', checkError)
          // Continue anyway - don't block if check fails
        } else if (existingNotification) {
          console.log(`⏭️ Skipping duplicate ${type} notification for user ${userId} (already exists - created: ${existingNotification.created_at})`)
          return true // Return true to indicate "handled" (not an error, just skipped)
        }
      } else {
        // For auth notifications, check recent ones only (30 seconds)
        const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString()
        const { data: existingNotification, error: checkError } = await supabase
          .from('notifications')
          .select('id, created_at')
          .eq('user_id', userId)
          .eq('type', type)
          .gte('created_at', thirtySecondsAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (checkError) {
          console.error('Error checking for duplicate notification:', checkError)
          // Continue anyway - don't block if check fails
        } else if (existingNotification) {
          console.log(`⏭️ Skipping duplicate ${type} notification for user ${userId} (already exists at ${existingNotification.created_at})`)
          return true // Return true to indicate "handled" (not an error, just skipped)
        }
      }
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

