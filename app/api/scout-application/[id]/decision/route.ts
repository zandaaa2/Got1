import { createRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAdmin } from '@/lib/admin'
import { sendApplicationApprovedEmail, sendApplicationDeniedEmail } from '@/lib/email'
import { getUserEmail } from '@/lib/supabase-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient(() => cookieStore)

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    const userIsAdmin = await isAdmin(session.user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { decision } = body

    if (decision !== 'approved' && decision !== 'denied') {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
    }

    // Get application
    const { data: application } = await supabase
      .from('scout_applications')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.status !== 'pending') {
      return NextResponse.json(
        { error: 'Application already processed' },
        { status: 400 }
      )
    }

    // Update application status
    const { data: updatedApplication, error: updateError } = await supabase
      .from('scout_applications')
      .update({
        status: decision,
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.id,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating application:', updateError)
      console.error('Error code:', updateError.code)
      console.error('Error message:', updateError.message)
      console.error('Error details:', JSON.stringify(updateError, null, 2))
      
      // Check if it's an RLS policy error
      if (updateError.code === '42501' || updateError.message?.includes('policy') || updateError.message?.includes('permission denied')) {
        return NextResponse.json(
          { 
            error: 'RLS Policy Error: You need to run add-admin-scout-applications-update-policy.sql in Supabase SQL Editor',
            details: updateError.message 
          },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to update application',
          details: updateError.message || 'Unknown error',
          code: updateError.code
        },
        { status: 500 }
      )
    }

    // Verify the update succeeded
    console.log(`✅ Application ${params.id} updated to status: ${updatedApplication?.status}`)
    console.log('Updated application data:', updatedApplication)

    // If approved, update user's profile role to scout
    if (decision === 'approved') {
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'scout',
          organization: application.current_workplace,
          position: application.current_position || null, // Save position from application
          work_history: application.work_history || null, // Save work history from application
          additional_info: application.additional_info || null, // Save additional info from application
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', application.user_id)
        .select()
        .single()

      if (profileError) {
        console.error('❌ Error updating profile to scout:', profileError)
        console.error('Profile error code:', profileError.code)
        console.error('Profile error message:', profileError.message)
        console.error('User ID being updated:', application.user_id)
        // Continue even if profile update fails, but log the error
      } else {
        console.log('✅ Profile updated to scout successfully')
        console.log('Updated profile:', updatedProfile)
      }

      // Send approval email to user
      try {
        const userEmail = await getUserEmail(application.user_id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', application.user_id)
          .maybeSingle()

        if (userEmail) {
          await sendApplicationApprovedEmail(
            userEmail,
            profile?.full_name || 'there'
          )
        }
      } catch (emailError) {
        console.error('Error sending approval email:', emailError)
        // Don't fail the request if email fails
      }
    } else {
      // Send denial email to user
      try {
        const userEmail = await getUserEmail(application.user_id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', application.user_id)
          .maybeSingle()

        if (userEmail) {
          await sendApplicationDeniedEmail(
            userEmail,
            profile?.full_name || 'there'
          )
        }
      } catch (emailError) {
        console.error('Error sending denial email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ success: true, decision })
  } catch (error: any) {
    console.error('Error processing decision:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

