import { Resend } from 'resend'

/**
 * Email utility functions for sending notifications via Resend.
 * Falls back to console logging if email service is not configured.
 */

/**
 * Gets the Resend client instance if API key is configured.
 */
function getResendClient(): Resend | null {
  if (process.env.RESEND_API_KEY) {
    return new Resend(process.env.RESEND_API_KEY)
  }
  return null
}

/**
 * Gets the from email address.
 */
function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
}

/**
 * Gets the base URL for the application.
 */
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

/**
 * Sends an email using Resend, with fallback to console logging.
 * 
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - Email HTML content
 * @returns Promise that resolves when email is sent or logged
 */
async function sendEmail(to: string, subject: string, html: string): Promise<string | null> {
  const resend = getResendClient()
  const fromEmail = getFromEmail()

  if (resend) {
    try {
      console.log(`📧 Preparing to send email via Resend:`)
      console.log(`   To: ${to}`)
      console.log(`   From: ${fromEmail}`)
      console.log(`   Subject: ${subject}`)
      console.log(`   HTML length: ${html.length} characters`)
      
      const replyTo = process.env.RESEND_REPLY_TO || 'zander@got1.app'
      
      const result = await resend.emails.send({
        from: fromEmail,
        reply_to: replyTo,
        to,
        subject,
        html,
        headers: {
          'X-Entity-Ref-ID': `got1-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      })
      
      console.log(`✅ Resend API call successful`)
      console.log(`📧 Full response:`, JSON.stringify(result, null, 2))
      console.log(`📧 Resend Email ID: ${result.data?.id || 'No ID returned'}`)
      console.log(`📧 Response error:`, result.error || 'none')
      
      if (result.data?.id) {
        console.log(`📧 Check delivery status at: https://resend.com/emails/${result.data.id}`)
      } else {
        console.warn(`⚠️ No email ID returned from Resend - email may not have been queued`)
      }
      
      if (result.error) {
        console.error(`❌ Resend returned an error:`, result.error)
        throw new Error(`Resend error: ${JSON.stringify(result.error)}`)
      }
      
      return result.data?.id || null
    } catch (error: any) {
      console.error(`❌ Failed to send email to ${to}`)
      console.error(`❌ Error type:`, error?.constructor?.name)
      console.error(`❌ Error message:`, error?.message)
      console.error(`❌ Error details:`, JSON.stringify(error, null, 2))
      if (error?.response) {
        console.error(`❌ HTTP Response:`, JSON.stringify(error.response, null, 2))
      }
      // Fallback to console log
      console.log('=== EMAIL (Failed to send, logged to console) ===')
      console.log(`To: ${to}`)
      console.log(`Subject: ${subject}`)
      console.log('HTML:', html.substring(0, 200) + '...')
      console.log('==============================================')
      throw error
    }
  } else {
    // No email service configured, just log
    console.log('=== EMAIL (No service configured) ===')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log('HTML:', html.substring(0, 200) + '...')
    console.log('⚠️  Note: RESEND_API_KEY not configured. Configure Resend to receive email notifications.')
    console.log('=====================================')
    return null
  }
}

/**
 * Sends a welcome email to a new user.
 * 
 * @param userEmail - The user's email address
 * @param userName - The user's name
 */
export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #000; margin-bottom: 20px;">Welcome to Got1!</h2>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        Hi ${userName || 'there'},
      </p>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        Welcome to Got1! We're excited to have you join our platform connecting high school football players 
        with college scouts for professional film evaluations.
      </p>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        To get started, please complete your profile so other users can find you on the platform.
      </p>
      <div style="margin-top: 30px; text-align: center;">
        <a href="${getBaseUrl()}/profile/edit" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Complete Your Profile</a>
      </div>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        If you have any questions, feel free to reach out through the platform.
      </p>
    </div>
  `

  await sendEmail(userEmail, 'Welcome to Got1!', html)
}

/**
 * Sends an email notification to a scout when a player requests an evaluation.
 * 
 * @param scoutEmail - The scout's email address
 * @param scoutName - The scout's name
 * @param playerName - The player's name
 * @param playerSchool - The player's school
 * @param evaluationId - The evaluation ID
 * @param price - The price of the evaluation
 */
export async function sendEvaluationRequestEmail(
  scoutEmail: string,
  scoutName: string,
  playerName: string,
  playerSchool: string | null,
  evaluationId: string,
  price: number
): Promise<void> {
  const evaluationUrl = `${getBaseUrl()}/evaluations/${evaluationId}`
  const schoolInfo = playerSchool ? ` from ${playerSchool}` : ''
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #000; margin-bottom: 20px;">New Evaluation Request</h2>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        Hi ${scoutName || 'there'},
      </p>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        You have received a new evaluation request from <strong>${playerName}${schoolInfo}</strong>.
      </p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 10px 0;"><strong>Player:</strong> ${playerName}</p>
        ${playerSchool ? `<p style="margin: 10px 0;"><strong>School:</strong> ${playerSchool}</p>` : ''}
        <p style="margin: 10px 0;"><strong>Price:</strong> $${price.toFixed(2)}</p>
      </div>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        Please complete the evaluation within the agreed turnaround time.
      </p>
      <div style="margin-top: 30px; text-align: center;">
        <a href="${evaluationUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Evaluation</a>
      </div>
    </div>
  `

  await sendEmail(scoutEmail, `New Evaluation Request from ${playerName}`, html)
}

/**
 * Sends an email notification to a player when their evaluation request is denied by a scout.
 * 
 * @param playerEmail - The player's email address
 * @param playerName - The player's name
 * @param scoutName - The scout's name
 * @param deniedReason - The reason provided by the scout for denying the request
 */
export async function sendEvaluationDeniedEmail(
  playerEmail: string,
  playerName: string,
  scoutName: string,
  deniedReason: string
): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #000; margin-bottom: 20px;">Evaluation Request Update</h2>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        Hi ${playerName || 'there'},
      </p>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        We wanted to let you know that <strong>${scoutName}</strong> has declined your evaluation request.
      </p>
      ${deniedReason ? `
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 10px 0; color: #856404; font-weight: bold;">Reason:</p>
        <p style="margin: 0; color: #856404; white-space: pre-wrap;">${deniedReason}</p>
      </div>
      ` : ''}
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        Don't worry - you can still request evaluations from other scouts on the platform. Browse available scouts to find the right match for you.
      </p>
      <div style="margin-top: 30px; text-align: center;">
        <a href="${getBaseUrl()}/browse" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Browse Scouts</a>
      </div>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Thank you for using Got1!
      </p>
    </div>
  `

  await sendEmail(playerEmail, `Your Evaluation Request Was Declined by ${scoutName}`, html)
}

/**
 * Sends an email notification to a player when a scout confirms their evaluation request.
 * Includes a payment link for the player to complete payment.
 * 
 * @param playerEmail - The player's email address
 * @param playerName - The player's name
 * @param scoutName - The scout's name
 * @param evaluationId - The evaluation ID
 * @param paymentUrl - The Stripe Checkout URL for payment
 * @param price - The price of the evaluation
 */
export async function sendEvaluationConfirmedEmail(
  playerEmail: string,
  playerName: string,
  scoutName: string,
  evaluationId: string,
  paymentUrl: string,
  price: number
): Promise<void> {
  const evaluationUrl = `${getBaseUrl()}/evaluations/${evaluationId}`
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #000; margin-bottom: 20px;">Evaluation Request Confirmed!</h2>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        Hi ${playerName || 'there'},
      </p>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        Great news! <strong>${scoutName}</strong> has confirmed your evaluation request.
      </p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 10px 0;"><strong>Scout:</strong> ${scoutName}</p>
        <p style="margin: 10px 0;"><strong>Price:</strong> $${price.toFixed(2)}</p>
      </div>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        To proceed, please complete your payment. The evaluation will begin once payment is confirmed.
      </p>
      <div style="margin-top: 30px; text-align: center;">
        <a href="${paymentUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Complete Payment</a>
      </div>
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Or view your evaluation: <a href="${evaluationUrl}" style="color: #000;">${evaluationUrl}</a>
      </p>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Thank you for using Got1!
      </p>
    </div>
  `

  await sendEmail(playerEmail, `Your Evaluation Request Has Been Confirmed by ${scoutName}`, html)
}

/**
 * Sends an email notification to a player when their evaluation is completed.
 * 
 * @param playerEmail - The player's email address
 * @param playerName - The player's name
 * @param scoutName - The scout's name
 * @param evaluationId - The evaluation ID
 */
export async function sendEvaluationCompleteEmail(
  playerEmail: string,
  playerName: string,
  scoutName: string,
  evaluationId: string
): Promise<void> {
  const evaluationUrl = `${getBaseUrl()}/evaluations/${evaluationId}`
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #000; margin-bottom: 20px;">Your Evaluation is Ready!</h2>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        Hi ${playerName || 'there'},
      </p>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        Great news! <strong>${scoutName}</strong> has completed your evaluation.
      </p>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        You can now view the detailed feedback and analysis from your scout.
      </p>
      <div style="margin-top: 30px; text-align: center;">
        <a href="${evaluationUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Evaluation</a>
      </div>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Thank you for using Got1!
      </p>
    </div>
  `

  await sendEmail(playerEmail, `Your Evaluation from ${scoutName} is Ready`, html)
}

/**
 * Sends an email notification to a user when their scout application is approved.
 * 
 * @param userEmail - The user's email address
 * @param userName - The user's name
 */
export async function sendApplicationApprovedEmail(
  userEmail: string,
  userName: string
): Promise<void> {
  const profileUrl = `${getBaseUrl()}/profile`
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #000; margin-bottom: 20px;">Scout Application Approved!</h2>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        Hi ${userName || 'there'},
      </p>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        Congratulations! Your scout application has been approved. You are now a verified scout on Got1.
      </p>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        You can now start receiving evaluation requests from players and set your pricing.
      </p>
      <div style="margin-top: 30px; text-align: center;">
        <a href="${profileUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Your Profile</a>
      </div>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Welcome to the Got1 community!
      </p>
    </div>
  `

  await sendEmail(userEmail, 'Your Scout Application Has Been Approved', html)
}

/**
 * Sends an email notification to a user when their scout application is denied.
 * 
 * @param userEmail - The user's email address
 * @param userName - The user's name
 */
export async function sendApplicationDeniedEmail(
  userEmail: string,
  userName: string
): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #000; margin-bottom: 20px;">Scout Application Update</h2>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        Hi ${userName || 'there'},
      </p>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        Thank you for your interest in becoming a scout on Got1. After careful review, we are unable to approve 
        your scout application at this time.
      </p>
      <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
        If you have any questions about this decision, please contact us through the platform.
      </p>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Thank you for your interest in Got1.
      </p>
    </div>
  `

  await sendEmail(userEmail, 'Scout Application Update', html)
}

/**
 * Sends an email notification to the admin when a new scout application is submitted.
 * This is the existing function from scout-application/submit/route.ts, moved here for consistency.
 * 
 * @param profile - The applicant's profile data
 * @param application - The scout application data
 * @param applicantEmail - The applicant's email address
 */
export async function sendApplicationEmail(
  profile: any,
  application: any,
  applicantEmail: string | null
): Promise<void> {
  const adminEmail = 'zander@got1.app'
  const applicationUrl = `${getBaseUrl()}/admin/scout-applications/${application.id}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #000; margin-bottom: 20px;">New Scout Application</h2>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 10px 0;"><strong>Name:</strong> ${profile.full_name || 'Unknown'}</p>
        <p style="margin: 10px 0;"><strong>Email:</strong> ${applicantEmail || 'Not available'}</p>
        <p style="margin: 10px 0;"><strong>Current Workplace:</strong> ${application.current_workplace}</p>
        <p style="margin: 10px 0;"><strong>Current Position:</strong> ${application.current_position}</p>
      </div>
      <div style="margin-bottom: 20px;">
        <h3 style="color: #000; margin-bottom: 10px;">Work History:</h3>
        <p style="white-space: pre-wrap; background: #fff; padding: 15px; border-radius: 4px;">${application.work_history}</p>
      </div>
      ${application.additional_info ? `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #000; margin-bottom: 10px;">Additional Information:</h3>
        <p style="white-space: pre-wrap; background: #fff; padding: 15px; border-radius: 4px;">${application.additional_info}</p>
      </div>
      ` : ''}
      <div style="margin-top: 30px; text-align: center;">
        <a href="${applicationUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Review Application</a>
      </div>
    </div>
  `

  await sendEmail(adminEmail, `New Scout Application from ${profile.full_name}`, html)
}

