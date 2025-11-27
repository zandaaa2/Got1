import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@/lib/supabase'

/**
 * Fix specific players by email - update their full_name from auth.users
 * This is a targeted fix for players whose full_name is set to their username
 */
export async function POST(request: NextRequest) {
  try {
    const adminResult = await requireAdmin(request)
    if (adminResult.response) {
      return adminResult.response
    }
    const { supabase } = adminResult

    const { emails } = await request.json()

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'emails array required' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Admin client not configured. Check SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      )
    }

    console.log('🔄 Fixing specific players:', emails)

    const results = []

    for (const email of emails) {
      try {
        // Find user by email
        const { data: { users }, error: findError } = await adminClient.auth.admin.listUsers()
        
        if (findError) {
          console.error(`❌ Error listing users:`, findError)
          results.push({ email, error: findError.message })
          continue
        }

        const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
        
        if (!user) {
          console.warn(`⚠️ User not found for email: ${email}`)
          results.push({ email, error: 'User not found' })
          continue
        }

        // Get profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, username, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!profile) {
          console.warn(`⚠️ Profile not found for ${email}`)
          results.push({ email, error: 'Profile not found' })
          continue
        }

        // Extract display name from auth.users - check all possible fields
        const authName = user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.user_metadata?.display_name ||
                        user.user_metadata?.given_name && user.user_metadata?.family_name 
                          ? `${user.user_metadata.given_name} ${user.user_metadata.family_name}`.trim()
                          : null

        const authAvatar = user.user_metadata?.avatar_url || 
                         user.user_metadata?.picture || 
                         user.user_metadata?.photo_url ||
                         null

        console.log(`🔍 ${email}:`, {
          current_full_name: profile.full_name,
          current_username: profile.username,
          authName,
          authAvatar,
          userMetadata: JSON.stringify(user.user_metadata, null, 2),
        })

        // Prepare update
        const updateData: any = {}
        let updated = false

        // Update name if it's missing or equals username
        const nameIsUsername = profile.full_name?.toLowerCase() === profile.username?.toLowerCase()
        if (authName && (!profile.full_name || nameIsUsername)) {
          updateData.full_name = authName.trim()
          updated = true
        }

        // Update avatar if missing
        if (authAvatar && !profile.avatar_url) {
          updateData.avatar_url = authAvatar.trim()
          updated = true
        }

        if (updated) {
          updateData.updated_at = new Date().toISOString()

          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', profile.id)

          if (updateError) {
            console.error(`❌ Error updating ${email}:`, updateError)
            results.push({ email, error: updateError.message, updated: false })
          } else {
            console.log(`✅ Updated ${email}:`, updateData)
            results.push({ 
              email, 
              updated: true, 
              changes: updateData,
              before: {
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
              },
              after: {
                full_name: updateData.full_name || profile.full_name,
                avatar_url: updateData.avatar_url || profile.avatar_url,
              },
            })
          }
        } else {
          results.push({ 
            email, 
            updated: false, 
            reason: authName ? 'No changes needed' : 'Display name not found in auth.users',
            authNameFound: !!authName,
          })
        }
      } catch (err: any) {
        console.error(`❌ Error processing ${email}:`, err)
        results.push({ email, error: err.message })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: emails.length,
        updated: results.filter(r => r.updated).length,
        failed: results.filter(r => r.error).length,
        skipped: results.filter(r => !r.updated && !r.error).length,
      },
    })
  } catch (error: any) {
    console.error('❌ Fix error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

