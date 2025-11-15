import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-helpers'
import { createNotification } from '@/lib/notifications'

/**
 * Test endpoint to create all notification types for the authenticated user.
 * Useful for testing notification display, icons, and functionality.
 * 
 * GET /api/test/notifications/all - Creates one of each notification type
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    // Get user profile for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle()

    const userRole = profile?.role || 'user'
    const userId = session.user.id

    // Create all notification types
    const notifications = [
      // Evaluation Notifications
      {
        type: 'evaluation_requested',
        title: 'New Evaluation Requested',
        message: 'A player has requested an evaluation from you.',
        link: '/my-evals',
        metadata: { test: true, evaluation_id: 'test-eval-1' },
      },
      {
        type: 'evaluation_confirmed',
        title: 'Evaluation Confirmed',
        message: 'Your evaluation request has been confirmed by the scout.',
        link: '/my-evals',
        metadata: { test: true, evaluation_id: 'test-eval-2' },
      },
      {
        type: 'evaluation_denied',
        title: 'Evaluation Denied',
        message: 'Your evaluation request was denied by the scout.',
        link: '/my-evals',
        metadata: { test: true, evaluation_id: 'test-eval-3', reason: 'Not available' },
      },
      {
        type: 'evaluation_completed',
        title: 'Evaluation Completed',
        message: 'Your evaluation has been completed! Check out your feedback.',
        link: '/my-evals',
        metadata: { test: true, evaluation_id: 'test-eval-4' },
      },
      {
        type: 'evaluation_cancelled',
        title: 'Evaluation Cancelled',
        message: 'An evaluation request has been cancelled.',
        link: '/my-evals',
        metadata: { test: true, evaluation_id: 'test-eval-5' },
      },
      // Scout Application Notifications
      {
        type: 'scout_application_approved',
        title: 'Scout Application Approved',
        message: 'Congratulations! Your scout application has been approved.',
        link: '/profile',
        metadata: { test: true, application_id: 'test-app-1' },
      },
      {
        type: 'scout_application_denied',
        title: 'Scout Application Denied',
        message: 'Your scout application was not approved at this time.',
        link: '/profile',
        metadata: { test: true, application_id: 'test-app-2' },
      },
      // Payment Notifications
      {
        type: 'payment_received',
        title: 'Payment Received',
        message: 'Your payment has been successfully processed.',
        link: '/my-evals',
        metadata: { test: true, amount: 99.00, payment_id: 'test-payment-1' },
      },
      {
        type: 'payment_failed',
        title: 'Payment Failed',
        message: 'There was an issue processing your payment. Please try again.',
        link: '/profile',
        metadata: { test: true, error: 'Card declined', payment_id: 'test-payment-2' },
      },
      // User Account Notifications
      {
        type: 'user_signed_up',
        title: 'Welcome to Got1!',
        message: 'Thanks for signing up! Complete your profile to get started.',
        link: '/profile/user-setup',
        metadata: { test: true, signup_method: 'email' },
      },
      {
        type: 'user_signed_in',
        title: 'Welcome Back!',
        message: 'You have successfully signed in.',
        link: '/',
        metadata: { test: true, signin_method: 'google' },
      },
      {
        type: 'user_converted_to_player',
        title: 'Account Updated',
        message: 'Your account has been updated to Player. Start browsing scouts!',
        link: '/browse',
        metadata: { test: true, previous_role: 'user', new_role: 'player' },
      },
      {
        type: 'user_converted_to_basic',
        title: 'Account Updated',
        message: 'Your account has been updated to a basic user account.',
        link: '/profile',
        metadata: { test: true, previous_role: 'player', new_role: 'user' },
      },
      // Stripe/Account Notifications (only for scouts)
      ...(userRole === 'scout' ? [
        {
          type: 'stripe_account_issue',
          title: 'Stripe Account Action Required',
          message: 'Your Stripe account needs attention. Please resolve the requirements to enable payouts.',
          link: '/profile',
          metadata: {
            test: true,
            requirementsDue: ['external_account', 'individual.verification.document'],
            requirementsPastDue: [],
            requirementsReason: 'Additional verification needed',
          },
        },
        {
          type: 'scout_ready_to_earn',
          title: 'Congratulations! You\'re Ready to Earn',
          message: 'Your Stripe account is fully set up! You can now start receiving evaluation requests and earning money.',
          link: '/browse',
          metadata: {
            test: true,
            chargesEnabled: true,
            payoutsEnabled: true,
          },
        },
      ] : []),
    ]

    // Create all notifications
    const results = []
    for (const notif of notifications) {
      try {
        const success = await createNotification({
          userId,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          link: notif.link,
          metadata: notif.metadata,
        })
        results.push({
          type: notif.type,
          success,
        })
      } catch (error: any) {
        results.push({
          type: notif.type,
          success: false,
          error: error.message,
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Created ${successCount} notifications${failCount > 0 ? ` (${failCount} failed)` : ''}`,
      results,
      total: notifications.length,
      successful: successCount,
      failed: failCount,
    })
  } catch (error: any) {
    console.error('Error creating test notifications:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

