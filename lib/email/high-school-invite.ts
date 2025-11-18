import { sendEmail } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase-admin'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Send roster invite email to a player
 */
export async function sendRosterInviteEmail({
  email,
  schoolName,
  schoolId,
  inviteToken,
  playerName,
}: {
  email: string
  schoolName: string
  schoolId: string
  inviteToken: string
  playerName: string
}): Promise<void> {
  // Fetch school name if not provided
  let actualSchoolName = schoolName
  if (!actualSchoolName) {
    const adminSupabase = createAdminClient()
    if (adminSupabase) {
      const { data: school } = await adminSupabase
        .from('high_schools')
        .select('name')
        .eq('id', schoolId)
        .maybeSingle()
      
      if (school) {
        actualSchoolName = school.name
      }
    }
  }
  
  const inviteUrl = `${BASE_URL}/api/high-school/players/accept-invite/${inviteToken}`
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #000; margin-bottom: 20px;">You've been added to ${actualSchoolName}'s roster!</h1>
      
      <p style="color: #333; line-height: 1.6; margin-bottom: 16px;">
        Hi ${playerName},
      </p>
      
      <p style="color: #333; line-height: 1.6; margin-bottom: 16px;">
        You've been added to <strong>${actualSchoolName}</strong>'s roster on Got1. 
        To join the team, please sign up for Got1 and accept the invitation.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a 
          href="${inviteUrl}"
          style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;"
        >
          Accept Invitation
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        This link will expire in 30 days. If you have any questions, please contact the school administrator.
      </p>
      
      <p style="color: #666; font-size: 14px; margin-top: 10px;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `
  
  try {
    await sendEmail(
      email,
      `Join ${actualSchoolName} on Got1`,
      html
    )
  } catch (error) {
    console.error('Error sending roster invite email:', error)
    // Don't throw - email failures shouldn't block the operation
  }
}

/**
 * Send admin invite email
 */
export async function sendAdminInviteEmail({
  email,
  schoolName,
  schoolId,
  inviteToken,
  invitedBy,
}: {
  email: string
  schoolName: string
  schoolId: string
  inviteToken: string
  invitedBy: string
}): Promise<void> {
  const inviteUrl = `${BASE_URL}/api/high-school/admins/accept-invite/${inviteToken}`
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #000; margin-bottom: 20px;">You've been invited to admin ${schoolName}</h1>
      
      <p style="color: #333; line-height: 1.6; margin-bottom: 16px;">
        You've been invited to become an administrator of <strong>${schoolName}</strong> on Got1.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a 
          href="${inviteUrl}"
          style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;"
        >
          Accept Invitation
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        This link will expire in 30 days. Once you accept, you'll have full admin access to manage the school's roster, evaluations, and settings.
      </p>
    </div>
  `
  
  try {
    await sendEmail(
      email,
      `Admin Invitation: ${schoolName}`,
      html
    )
  } catch (error) {
    console.error('Error sending admin invite email:', error)
    // Don't throw - email failures shouldn't block the operation
  }
}

