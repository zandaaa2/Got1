import { createRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAdmin } from '@/lib/admin'

/**
 * API route to revoke a scout's verification status by changing their role back to 'player'.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
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

    const { userId } = params
    console.log('Revoke request for userId:', userId)

    // Get the scout's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Profile not found', details: profileError.message }, { status: 404 })
    }

    if (!profile) {
      console.error('Profile not found for userId:', userId)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    console.log('Profile found:', { id: profile.id, user_id: profile.user_id, role: profile.role })

    if (profile.role !== 'scout') {
      console.log('User is not a scout, current role:', profile.role)
      return NextResponse.json(
        { error: 'User is not a scout', currentRole: profile.role },
        { status: 400 }
      )
    }

    // Also deny any approved scout applications to prevent auto-restoration
    const { data: approvedApplications } = await supabase
      .from('scout_applications')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
    
    if (approvedApplications && approvedApplications.length > 0) {
      console.log(`Denying ${approvedApplications.length} approved application(s) to prevent auto-restoration`)
      for (const application of approvedApplications) {
        const { error: denyError } = await supabase
          .from('scout_applications')
          .update({
            status: 'denied',
            reviewed_at: new Date().toISOString(),
            reviewed_by: session.user.id,
          })
          .eq('id', application.id)
        
        if (denyError) {
          console.error('Error denying application:', denyError)
        } else {
          console.log(`✅ Denied application ${application.id}`)
        }
      }
    }

    // Revoke scout status by changing role to 'player'
    console.log('Attempting to update profile with user_id:', userId)
    console.log('Profile before update:', profile)
    
    const { data: updatedProfiles, error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'player',
        organization: null,
        price_per_eval: null,
        social_link: null,
        turnaround_time: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()

    console.log('Update result:', { updatedProfiles, updateError, count: updatedProfiles?.length })

    if (updateError) {
      console.error('Error revoking scout status:', updateError)
      console.error('Error code:', updateError.code)
      console.error('Error message:', updateError.message)
      console.error('Error details:', JSON.stringify(updateError, null, 2))
      return NextResponse.json(
        { 
          error: 'Failed to revoke scout status',
          details: updateError.message,
          code: updateError.code
        },
        { status: 500 }
      )
    }

    if (!updatedProfiles || updatedProfiles.length === 0) {
      console.error('No profile was updated')
      console.error('This could mean:')
      console.error('1. RLS policy is blocking the update')
      console.error('2. The user_id does not match any profile')
      console.error('3. The profile was already updated')
      console.error('Profile that was queried:', profile)
      console.error('User ID being used:', userId)
      
      // Try to verify the profile still exists and has the expected role
      const { data: verifyProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      console.log('Profile verification after failed update:', verifyProfile)
      
      return NextResponse.json(
        { 
          error: 'No profile was updated',
          details: 'The update query did not affect any rows. This may be due to RLS policies or the profile not matching the query.',
          profileFound: !!verifyProfile,
          currentRole: verifyProfile?.role
        },
        { status: 404 }
      )
    }

    console.log('✅ Scout status revoked successfully:', updatedProfiles[0])
    return NextResponse.json({ success: true, profile: updatedProfiles[0] })
  } catch (error: any) {
    console.error('Error revoking scout status:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

