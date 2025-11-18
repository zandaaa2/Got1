import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'
import { isUsernameAvailable } from '@/lib/high-school/school'
import { trackReferral } from '@/lib/high-school/referral'
import { isReferralFeatureActive } from '@/lib/high-school/utils'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const body = await request.json()
    const { name, username, address, referral_school_id, logo_url } = body

    if (!name || !username) {
      return NextResponse.json(
        { error: 'Name and username are required' },
        { status: 400 }
      )
    }

    // Validate username format (alphanumeric, lowercase, hyphens, underscores)
    const usernameRegex = /^[a-z0-9_-]+$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Username can only contain lowercase letters, numbers, hyphens, and underscores' },
        { status: 400 }
      )
    }

    // Check if username is available
    const available = await isUsernameAvailable(username)
    if (!available) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      )
    }

    // Validate referral if provided
    if (referral_school_id && isReferralFeatureActive()) {
      const adminSupabase = createAdminClient()
      if (adminSupabase) {
        const { data: referringSchool } = await adminSupabase
          .from('high_schools')
          .select('id, admin_status')
          .eq('id', referral_school_id)
          .maybeSingle()

        if (!referringSchool) {
          return NextResponse.json(
            { error: 'Invalid referring school' },
            { status: 400 }
          )
        }
      }
    }

    // Create school
    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { data: school, error: createError } = await adminSupabase
      .from('high_schools')
      .insert({
        name: name.trim(),
        username: username.toLowerCase().trim(),
        address: address?.trim() || null,
        referral_school_id: referral_school_id || null,
        logo_url: logo_url || null,
        created_by: session.user.id,
        admin_status: 'approved', // Public immediately, payment requires admin confirmation
      })
      .select()
      .single()

    if (createError || !school) {
      return handleApiError(createError, 'Failed to create high school')
    }

    // Add creator as first admin
    // Check if already exists first to avoid duplicate key errors
    const { data: existingAdmin } = await adminSupabase
      .from('high_school_admins')
      .select('id')
      .eq('high_school_id', school.id)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (!existingAdmin) {
      const { error: adminError } = await adminSupabase
        .from('high_school_admins')
        .insert({
          high_school_id: school.id,
          user_id: session.user.id,
          invited_by: null,
        })

      if (adminError) {
        console.error('Error adding creator as admin:', adminError)
        // Don't fail the request, but log the error
        // The creator will still show in the admin list via created_by field
      }
    }

    // Track referral if provided
    if (referral_school_id && isReferralFeatureActive()) {
      await trackReferral(referral_school_id, school.id)
      // Bonus will be paid when school is approved by admin
    }

    return successResponse({
      success: true,
      school: {
        id: school.id,
        username: school.username,
        name: school.name,
        admin_status: school.admin_status,
      },
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to create high school')
  }
}

