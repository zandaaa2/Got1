import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const userId = session.user.id

    // Fetch all user data
    const [profileResult, evaluationsResult, scoutApplicationResult] = await Promise.all([
      // Profile data
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single(),
      
      // Evaluations (both as player and scout)
      supabase
        .from('evaluations')
        .select('*')
        .or(`player_id.eq.${userId},scout_id.eq.${userId}`),
      
      // Scout application (if exists)
      supabase
        .from('scout_applications')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

    // Compile user data - include errors if any occurred
    const userData = {
      exportDate: new Date().toISOString(),
      userId: userId,
      email: session.user.email,
      authMetadata: {
        createdAt: session.user.created_at,
        lastSignIn: session.user.last_sign_in_at,
        emailVerified: session.user.email_confirmed_at ? true : false,
      },
      profile: profileResult.data || null,
      evaluations: evaluationsResult.data || [],
      scoutApplication: scoutApplicationResult.data || null,
      errors: {
        profile: profileResult.error ? profileResult.error.message : null,
        evaluations: evaluationsResult.error ? evaluationsResult.error.message : null,
        scoutApplication: scoutApplicationResult.error ? scoutApplicationResult.error.message : null,
      },
    }

    // Log errors but still return data
    if (profileResult.error) {
      console.error('Error fetching profile:', profileResult.error)
    }
    if (evaluationsResult.error) {
      console.error('Error fetching evaluations:', evaluationsResult.error)
    }
    if (scoutApplicationResult.error) {
      console.error('Error fetching scout application:', scoutApplicationResult.error)
    }

    // Return as JSON
    return new NextResponse(JSON.stringify(userData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="got1-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error: any) {
    return handleApiError(error, 'Failed to export data')
  }
}

