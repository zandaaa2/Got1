import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@/lib/supabase'

/**
 * One-time sync script to update profiles table from auth.users metadata
 * This fixes existing players/scouts who have names/avatars in auth.users
 * but missing in the profiles table.
 * 
 * Run this once via: POST /api/admin/sync-profiles-from-auth
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin access
    const adminResult = await requireAdmin(request)
    if (adminResult.response) {
      return adminResult.response
    }
    const { supabase } = adminResult

    const adminClient = createAdminClient()
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Admin client not configured. Check SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      )
    }

    console.log('🔄 Starting profile sync from auth.users...')

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, username, avatar_url, role')

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
      return NextResponse.json(
        { error: 'Failed to fetch profiles', details: profilesError.message },
        { status: 500 }
      )
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: 'No profiles found', updated: 0 })
    }

    console.log(`📊 Found ${profiles.length} profiles to check`)

    let updated = 0
    let skipped = 0
    let errors = 0
    const updates: Array<{ user_id: string; full_name?: string; avatar_url?: string }> = []

    // For each profile, fetch auth metadata and update if needed
    for (const profile of profiles) {
      try {
        // Check if profile needs updating
        // Also check if full_name is just the username (which means it needs a real name)
        const hasName = profile.full_name && profile.full_name.trim().length > 0
        const nameIsUsername = hasName && profile.username && 
                               profile.full_name.toLowerCase().trim() === profile.username.toLowerCase().trim()
        const hasAvatar = profile.avatar_url && profile.avatar_url.trim().length > 0
        const needsNameUpdate = !hasName || nameIsUsername // Update if missing OR if it's just the username
        const needsAvatarUpdate = !hasAvatar

        // Log every profile for debugging
        console.log(`📋 Profile ${profile.id} (${profile.role}):`, {
          full_name: profile.full_name || '(null/empty)',
          avatar_url: profile.avatar_url ? 'exists' : '(null/empty)',
          needsNameUpdate,
          needsAvatarUpdate,
        })

        if (!needsNameUpdate && !needsAvatarUpdate) {
          skipped++
          continue
        }

        // Fetch user metadata from auth.users
        const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(profile.user_id)

        if (userError || !user) {
          console.warn(`⚠️ Could not fetch user ${profile.user_id}:`, userError?.message)
          errors++
          continue
        }

        // Extract metadata - check multiple possible locations
        const authName = user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.user_metadata?.display_name ||
                        null
        const authAvatar = user.user_metadata?.avatar_url || 
                         user.user_metadata?.picture || 
                         user.user_metadata?.photo_url ||
                         null

        // Log what we found for debugging - always log when we need updates
        if (needsNameUpdate || needsAvatarUpdate) {
          console.log(`🔍 User ${profile.user_id} (${profile.role}):`, {
            current_full_name: profile.full_name,
            current_username: profile.username,
            nameIsUsername: nameIsUsername,
            needsName: needsNameUpdate,
            needsAvatar: needsAvatarUpdate,
            foundName: !!authName,
            foundNameValue: authName,
            foundAvatar: !!authAvatar,
            foundAvatarValue: authAvatar,
            userMetadataKeys: Object.keys(user.user_metadata || {}),
            fullUserMetadata: JSON.stringify(user.user_metadata, null, 2),
          })
        }

        // Prepare update
        const updateData: any = {}
        if (needsNameUpdate && authName) {
          updateData.full_name = authName.trim()
        }
        if (needsAvatarUpdate && authAvatar) {
          updateData.avatar_url = authAvatar.trim()
        }

        // Only update if we have data to set
        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date().toISOString()

          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', profile.id)

          if (updateError) {
            console.error(`❌ Error updating profile ${profile.id}:`, updateError)
            errors++
          } else {
            updated++
            updates.push({
              user_id: profile.user_id,
              full_name: updateData.full_name,
              avatar_url: updateData.avatar_url,
            })
            console.log(`✅ Updated profile ${profile.id} (${profile.role}):`, {
              name: updateData.full_name ? '✓' : '✗',
              avatar: updateData.avatar_url ? '✓' : '✗',
            })
          }
        } else {
          skipped++
        }
      } catch (err: any) {
        console.error(`❌ Error processing profile ${profile.id}:`, err)
        errors++
      }
    }

    console.log(`✅ Sync complete: ${updated} updated, ${skipped} skipped, ${errors} errors`)

    return NextResponse.json({
      success: true,
      total: profiles.length,
      updated,
      skipped,
      errors,
      updates: updates.slice(0, 10), // Return first 10 as sample
    })
  } catch (error: any) {
    console.error('❌ Sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

