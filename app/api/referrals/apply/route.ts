import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/referrals/apply
 * Allows a user to apply to join the referral program
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }

    const { session } = authResult
    const adminSupabase = createAdminClient()

    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Check if user is a scout (only scouts can apply)
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (profile?.role !== 'scout') {
      return NextResponse.json(
        { error: 'Only verified scouts can apply for the referral program' },
        { status: 403 }
      )
    }

    // Check if user already has an application
    const { data: existingApplication } = await adminSupabase
      .from('referral_program_applications')
      .select('id, status')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (existingApplication) {
      if (existingApplication.status === 'pending') {
        return NextResponse.json(
          { error: 'You already have a pending application' },
          { status: 400 }
        )
      }
      if (existingApplication.status === 'approved') {
        return NextResponse.json(
          { error: 'You are already approved for the referral program' },
          { status: 400 }
        )
      }
      // If denied, allow them to apply again (delete old application)
      await adminSupabase
        .from('referral_program_applications')
        .delete()
        .eq('id', existingApplication.id)
    }

    // Create new application
    const { data: application, error: insertError } = await adminSupabase
      .from('referral_program_applications')
      .insert({
        user_id: session.user.id,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating referral application:', insertError)
      return NextResponse.json(
        { error: insertError.message || 'Failed to submit application' },
        { status: 500 }
      )
    }

    return successResponse({ 
      application,
      message: 'Application submitted successfully! We will review it soon.' 
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to submit referral application')
  }
}

