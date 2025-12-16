import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Creates a new player profile for a parent account
 * Uses admin client to bypass RLS since the parent is creating a profile with a placeholder user_id
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Verify user is a parent (using admin client to bypass RLS)
    const { data: parentProfile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'parent')
      .maybeSingle()

    if (!parentProfile) {
      return NextResponse.json({ error: 'Only parents can create player profiles' }, { status: 403 })
    }

    // Get request body - may contain full player data
    const body = await request.json().catch(() => ({}))
    const {
      full_name,
      username,
      social_link,
      hudl_links,
      hudl_link,
      position,
      school,
      graduation_month,
      graduation_year,
    } = body

    console.log('📝 API received player data:', {
      full_name,
      username,
      social_link,
      hudl_links,
      position,
      school,
      graduation_month,
      graduation_year,
    })

    // Normalize username helper function
    const normalizeUsername = (value: string) => {
      return value
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-_]+|[-_]+$/g, '')
        .slice(0, 30)
    }

    // Generate timestamp and random for system email (always needed)
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)

    // Validate and normalize username if provided
    let finalUsername: string
    if (username) {
      const normalized = normalizeUsername(username)
      if (normalized.length < 3) {
        return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
      }
      
      // Check if username is already taken
      const { data: existingUsername } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('username', normalized)
        .maybeSingle()
      
      if (existingUsername) {
        return NextResponse.json({ error: 'That username is already taken. Please choose another.' }, { status: 400 })
      }
      
      finalUsername = normalized
    } else {
      // Generate a unique temporary username if not provided
      // Using timestamp and random component to ensure uniqueness
      finalUsername = normalizeUsername(`player-${timestamp}-${random}`)
    }

    // Create an auth user for the player (required for foreign key constraint)
    // Use a system email that won't conflict - player won't be able to sign in with this
    const systemEmail = `player+${timestamp}-${random}@got1.app`
    const { data: authUser, error: createUserError } = await adminSupabase.auth.admin.createUser({
      email: systemEmail,
      email_confirm: true, // Auto-confirm so no email verification needed
      password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'A1!', // Random secure password
    })

    if (createUserError || !authUser?.user) {
      console.error('Error creating auth user for player:', createUserError)
      return handleApiError(createUserError || new Error('Failed to create auth user'), 'Failed to create player account')
    }

    const playerUserId = authUser.user.id

    // Check if a profile already exists for this user_id (in case of retry)
    const { data: existingProfile } = await adminSupabase
      .from('profiles')
      .select('id, user_id, role, username')
      .eq('user_id', playerUserId)
      .maybeSingle()

    if (existingProfile) {
      // Profile already exists - check if it's already linked to this parent
      const { data: existingLink } = await adminSupabase
        .from('parent_children')
        .select('id')
        .eq('parent_id', session.user.id)
        .eq('player_id', playerUserId)
        .maybeSingle()

      // Prepare update data if we have new information to save
      const updateData: any = {}
      if (full_name !== undefined && full_name !== null && full_name.trim() !== '') {
        updateData.full_name = full_name.trim()
      }
      if (social_link !== undefined && social_link !== null && social_link.trim() !== '') {
        updateData.social_link = social_link.trim()
      }
      if (hudl_links && Array.isArray(hudl_links) && hudl_links.length > 0) {
        updateData.hudl_links = hudl_links
        if (hudl_links[0].link) {
          updateData.hudl_link = hudl_links[0].link
        }
      } else if (hudl_link !== undefined && hudl_link !== null && hudl_link.trim() !== '') {
        updateData.hudl_link = hudl_link.trim()
        updateData.hudl_links = [{ link: hudl_link.trim(), sport: null }]
      }
      if (position !== undefined && position !== null && position.trim() !== '') {
        updateData.position = position.trim()
      }
      if (school !== undefined && school !== null && school.trim() !== '') {
        updateData.school = school.trim()
      }
      if (graduation_month !== undefined && graduation_month !== null && graduation_month !== '') {
        const monthInt = parseInt(graduation_month.toString())
        if (!isNaN(monthInt)) {
          updateData.graduation_month = monthInt
        }
      }
      if (graduation_year !== undefined && graduation_year !== null && graduation_year !== '') {
        const yearInt = parseInt(graduation_year.toString())
        if (!isNaN(yearInt)) {
          updateData.graduation_year = yearInt
        }
      }
      if (username && finalUsername !== existingProfile.username) {
        updateData.username = finalUsername
      }

      // Update profile if we have new data
      let updatedProfile = existingProfile
      if (Object.keys(updateData).length > 0) {
        console.log('🔄 Updating existing profile with new data:', updateData)
        const { data: updated, error: updateError } = await adminSupabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', playerUserId)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating existing profile:', updateError)
          // Continue anyway - at least return the existing profile
        } else if (updated) {
          updatedProfile = updated
          console.log('✅ Successfully updated existing profile')
        }
      }

      if (existingLink) {
        // Already linked - return the (possibly updated) profile
        return successResponse({
          playerProfile: updatedProfile,
          message: 'Player profile already exists and is linked'
        })
      } else {
        // Profile exists but not linked - create the link
        const { error: linkError } = await adminSupabase
          .from('parent_children')
          .insert({
            parent_id: session.user.id,
            player_id: playerUserId,
          })

        if (linkError) {
          console.error('Error linking existing profile:', linkError)
          return handleApiError(linkError, 'Failed to link existing player profile')
        }

        return successResponse({
          playerProfile: updatedProfile,
          message: 'Player profile already exists, linked successfully'
        })
      }
    }

    // Create player profile with the created user_id
    // Include all provided data, or create minimal profile if no data provided
    const playerProfileData: any = {
      user_id: playerUserId,
      role: 'player',
      username: finalUsername, // Required field
    }

    // Add optional fields if provided (check for existence and non-empty strings)
    if (full_name !== undefined && full_name !== null && full_name.trim() !== '') {
      playerProfileData.full_name = full_name.trim()
    }
    if (social_link !== undefined && social_link !== null && social_link.trim() !== '') {
      playerProfileData.social_link = social_link.trim()
    }
    if (hudl_links && Array.isArray(hudl_links) && hudl_links.length > 0) {
      playerProfileData.hudl_links = hudl_links
      // Also set hudl_link for backward compatibility
      if (hudl_links[0].link) {
        playerProfileData.hudl_link = hudl_links[0].link
      }
    } else if (hudl_link !== undefined && hudl_link !== null && hudl_link.trim() !== '') {
      playerProfileData.hudl_link = hudl_link.trim()
      playerProfileData.hudl_links = [{ link: hudl_link.trim(), sport: null }]
    }
    if (position !== undefined && position !== null && position.trim() !== '') {
      playerProfileData.position = position.trim()
    }
    if (school !== undefined && school !== null && school.trim() !== '') {
      playerProfileData.school = school.trim()
    }
    if (graduation_month !== undefined && graduation_month !== null && graduation_month !== '') {
      const monthInt = parseInt(graduation_month.toString())
      if (!isNaN(monthInt)) {
        playerProfileData.graduation_month = monthInt
      }
    }
    if (graduation_year !== undefined && graduation_year !== null && graduation_year !== '') {
      const yearInt = parseInt(graduation_year.toString())
      if (!isNaN(yearInt)) {
        playerProfileData.graduation_year = yearInt
      }
    }

    console.log('💾 Saving player profile with data:', JSON.stringify(playerProfileData, null, 2))

    const { data: playerProfile, error: createError } = await adminSupabase
      .from('profiles')
      .insert(playerProfileData)
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creating profile:', createError)
      console.error('Error creating player profile:', createError)
      
      // Handle duplicate key error specifically
      if (createError.code === '23505') {
        // Profile already exists - try to fetch it and link it
        const { data: existingProfile } = await adminSupabase
          .from('profiles')
          .select('*')
          .eq('user_id', playerUserId)
          .maybeSingle()

        if (existingProfile) {
          // Create the link if it doesn't exist
          const { error: linkError } = await adminSupabase
            .from('parent_children')
            .insert({
              parent_id: session.user.id,
              player_id: playerUserId,
            })
            .select()
            .maybeSingle() // Use maybeSingle to ignore if link already exists

          if (!linkError || linkError.code === '23505') {
            // Link exists or was created successfully
            return successResponse({
              playerProfile: existingProfile,
              message: 'Player profile already exists, linked successfully'
            })
          }
        }
      }
      
      // Clean up: delete the auth user we created if profile creation fails
      try {
        await adminSupabase.auth.admin.deleteUser(playerUserId)
      } catch (deleteError) {
        console.error('Error cleaning up auth user:', deleteError)
      }
      return handleApiError(createError, 'Failed to create player profile')
    }

    console.log('✅ Successfully created player profile:', JSON.stringify(playerProfile, null, 2))

    // Create parent_children relationship
    const { error: linkError } = await adminSupabase
      .from('parent_children')
      .insert({
        parent_id: session.user.id,
        player_id: playerUserId,
      })

    if (linkError) {
      // If linking fails, clean up: delete the player profile and auth user we created
      try {
        await adminSupabase.from('profiles').delete().eq('id', playerProfile.id)
        await adminSupabase.auth.admin.deleteUser(playerUserId)
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError)
      }
      console.error('Error creating parent_children link:', linkError)
      return handleApiError(linkError, 'Failed to link player to parent')
    }

    return successResponse({
      playerProfile,
      message: 'Player profile created successfully'
    })
  } catch (error: any) {
    console.error('Error creating player profile:', error)
    return handleApiError(error, 'Internal server error')
  }
}



