import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { isHighSchoolAdmin } from '@/lib/high-school/school'
import { isUsernameAvailable } from '@/lib/high-school/school'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session } = authResult

    // Check if user is admin of this school
    const isAdmin = await isHighSchoolAdmin(session.user.id, params.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be an admin of this school' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, username, address, profile_image_url, hudl_url, x_url } = body

    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get current school
    const { data: school } = await adminSupabase
      .from('high_schools')
      .select('username')
      .eq('id', params.id)
      .maybeSingle()

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    // Validate username if changed
    if (username && username !== school.username) {
      const usernameRegex = /^[a-z0-9_-]+$/
      if (!usernameRegex.test(username)) {
        return NextResponse.json(
          { error: 'Username can only contain lowercase letters, numbers, hyphens, and underscores' },
          { status: 400 }
        )
      }

      const available = await isUsernameAvailable(username, params.id)
      if (!available) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (username !== undefined) updateData.username = username.toLowerCase().trim()
    if (address !== undefined) updateData.address = address?.trim() || null
    if (profile_image_url !== undefined) updateData.profile_image_url = profile_image_url || null
    if (hudl_url !== undefined) updateData.hudl_url = hudl_url?.trim() || null
    if (x_url !== undefined) updateData.x_url = x_url?.trim() || null

    // Update school
    const { data: updatedSchool, error: updateError } = await adminSupabase
      .from('high_schools')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError || !updatedSchool) {
      return handleApiError(updateError, 'Failed to update school')
    }

    return successResponse({
      success: true,
      school: updatedSchool,
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to update school')
  }
}

