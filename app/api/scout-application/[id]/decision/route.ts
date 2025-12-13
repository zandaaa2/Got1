import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAdmin, handleApiError, successResponse } from '@/lib/api-helpers'
import { sendApplicationApprovedEmail, sendApplicationDeniedEmail } from '@/lib/email'
import { getUserEmail } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require admin access
    const adminResult = await requireAdmin(request)
    if (adminResult.response) {
      return adminResult.response
    }
    const { session, supabase } = adminResult

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
          social_link: application.social_link || null, // Save social link from application
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

      // Create Stripe Connect account for the scout
      try {
        // Get scout profile to check if they already have a Stripe account
        const { data: scoutProfile } = await supabase
          .from('profiles')
          .select('stripe_account_id, email')
          .eq('user_id', application.user_id)
          .maybeSingle()

        if (!scoutProfile?.stripe_account_id) {
          // Create Stripe Connect Express account
          const account = await stripe.accounts.create({
            type: 'express',
            country: 'US', // Update this based on your needs
            email: scoutProfile?.email || undefined,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            metadata: {
              scout_user_id: application.user_id,
              scout_name: updatedProfile?.full_name || 'Scout',
            },
          })

          // Save Stripe account ID to scout's profile
          const { error: stripeUpdateError } = await supabase
            .from('profiles')
            .update({
              stripe_account_id: account.id,
            })
            .eq('user_id', application.user_id)

          if (stripeUpdateError) {
            console.error('Error updating profile with Stripe account ID:', stripeUpdateError)
          } else {
            console.log(`✅ Created Stripe Connect account ${account.id} for scout ${application.user_id}`)
          }
        } else {
          console.log(`ℹ️ Scout already has Stripe Connect account: ${scoutProfile.stripe_account_id}`)
        }
      } catch (stripeError: any) {
        console.error('Error creating Stripe Connect account:', stripeError)
        // Don't fail the request if Stripe account creation fails
        // The scout can still be approved, and we can create the account later
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

      // Create in-app notification for approved application
      try {
        await createNotification({
          userId: application.user_id,
          type: 'scout_application_approved',
          title: 'Scout Application Approved',
          message: 'Congratulations! Your scout application has been approved. You can now start receiving evaluation requests.',
          link: '/profile',
          metadata: {
            application_id: params.id,
            organization: application.current_workplace,
          },
        })
      } catch (notificationError) {
        console.error('Error creating approval notification:', notificationError)
        // Don't fail the request if notification fails
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

      // Create in-app notification for denied application
      try {
        await createNotification({
          userId: application.user_id,
          type: 'scout_application_denied',
          title: 'Scout Application Denied',
          message: 'Your scout application has been reviewed and unfortunately was not approved at this time.',
          link: '/profile/scout-application',
          metadata: {
            application_id: params.id,
          },
        })
      } catch (notificationError) {
        console.error('Error creating denial notification:', notificationError)
        // Don't fail the request if notification fails
      }
    }

    return successResponse({ success: true, decision })
  } catch (error: any) {
    console.error('Error processing decision:', error)
    return handleApiError(error, 'Internal server error')
  }
}

