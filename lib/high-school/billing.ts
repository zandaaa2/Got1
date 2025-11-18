import { createAdminClient } from '@/lib/supabase-admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

/**
 * Create Stripe Connect account for a school
 */
export async function createSchoolStripeAccount(
  schoolId: string
): Promise<{ success: boolean; accountId?: string; error?: string }> {
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return { success: false, error: 'Admin client not available' }
  }
  
  // Get school info
  const { data: school } = await adminSupabase
    .from('high_schools')
    .select('name, id')
    .eq('id', schoolId)
    .maybeSingle()
  
  if (!school) {
    return { success: false, error: 'School not found' }
  }
  
  // Check if account already exists
  if (school.stripe_account_id) {
    return { success: true, accountId: school.stripe_account_id }
  }
  
  try {
    // Create Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: undefined, // Will be set during onboarding
      metadata: {
        school_id: schoolId,
        school_name: school.name,
      },
    })
    
    // Update school with Stripe account ID
    const { error: updateError } = await adminSupabase
      .from('high_schools')
      .update({ stripe_account_id: account.id })
      .eq('id', schoolId)
    
    if (updateError) {
      return { success: false, error: updateError.message }
    }
    
    return { success: true, accountId: account.id }
  } catch (error: any) {
    console.error('Error creating Stripe account:', error)
    return { success: false, error: error.message || 'Failed to create Stripe account' }
  }
}

/**
 * Generate donation link for a school
 */
export async function generateDonationLink(
  schoolId: string
): Promise<{ success: boolean; link?: string; error?: string }> {
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return { success: false, error: 'Admin client not available' }
  }
  
  // Get school info
  const { data: school } = await adminSupabase
    .from('high_schools')
    .select('id, name, donation_link, stripe_account_id')
    .eq('id', schoolId)
    .maybeSingle()
  
  if (!school) {
    return { success: false, error: 'School not found' }
  }
  
  // Return existing link if available
  if (school.donation_link) {
    return { success: true, link: school.donation_link }
  }
  
  // Ensure Stripe account exists
  let accountId = school.stripe_account_id
  if (!accountId) {
    const accountResult = await createSchoolStripeAccount(schoolId)
    if (!accountResult.success || !accountResult.accountId) {
      return { success: false, error: accountResult.error || 'Failed to create Stripe account' }
    }
    accountId = accountResult.accountId
  }
  
  try {
    // Create Stripe Payment Link (or Checkout Session for one-time donations)
    // For now, we'll create a Payment Link that can be reused
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Donation to ${school.name}`,
              description: `Support ${school.name} through Got1`,
            },
            unit_amount: 1000, // $10.00 default, but users can adjust
            recurring: undefined, // One-time payment
          },
          quantity: 1,
        },
      ],
      metadata: {
        school_id: schoolId,
        school_name: school.name,
        type: 'donation',
      },
      // Transfer funds to school's Connect account
      payment_intent_data: {
        application_fee_amount: Math.round(1000 * 0.05), // 5% platform fee
        transfer_data: {
          destination: accountId,
        },
      },
      allow_promotion_codes: true,
    })
    
    // Store the link
    const { error: updateError } = await adminSupabase
      .from('high_schools')
      .update({ donation_link: paymentLink.url })
      .eq('id', schoolId)
    
    if (updateError) {
      return { success: false, error: updateError.message }
    }
    
    return { success: true, link: paymentLink.url }
  } catch (error: any) {
    console.error('Error creating donation link:', error)
    return { success: false, error: error.message || 'Failed to create donation link' }
  }
}

/**
 * Process a donation (called from Stripe webhook)
 */
export async function processDonation(
  paymentIntentId: string,
  amount: number,
  schoolId: string
): Promise<{ success: boolean; error?: string }> {
  // This will be handled by the Stripe webhook
  // Just log it for now
  console.log('Processing donation:', { paymentIntentId, amount, schoolId })
  return { success: true }
}


