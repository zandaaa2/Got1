import { createAdminClient } from '@/lib/supabase-admin'
import { isReferralFeatureActive } from './utils'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

/**
 * Track a referral (when a school is created with a referral)
 */
export async function trackReferral(
  referringSchoolId: string,
  referredSchoolId: string
): Promise<{ success: boolean; referralId?: string; error?: string }> {
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return { success: false, error: 'Admin client not available' }
  }
  
  // Check if referral feature is active
  if (!isReferralFeatureActive()) {
    return { success: false, error: 'Referral feature is no longer active' }
  }
  
  // Check if referral already exists
  const { data: existing } = await adminSupabase
    .from('school_referrals')
    .select('id')
    .eq('referring_school_id', referringSchoolId)
    .eq('referred_school_id', referredSchoolId)
    .maybeSingle()
  
  if (existing) {
    return { success: true, referralId: existing.id }
  }
  
  // Create referral record
  const { data: referral, error } = await adminSupabase
    .from('school_referrals')
    .insert({
      referring_school_id: referringSchoolId,
      referred_school_id: referredSchoolId,
      bonus_status: 'pending', // Will be paid after admin approval
    })
    .select()
    .single()
  
  if (error || !referral) {
    return { success: false, error: error?.message || 'Failed to create referral' }
  }
  
  return { success: true, referralId: referral.id }
}

/**
 * Calculate total referral earnings for a school
 */
export async function calculateReferralBonus(
  schoolId: string
): Promise<{ total: number; pending: number; paid: number }> {
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return { total: 0, pending: 0, paid: 0 }
  }
  
  const { data: referrals } = await adminSupabase
    .from('school_referrals')
    .select('bonus_amount, bonus_status')
    .eq('referring_school_id', schoolId)
  
  if (!referrals) {
    return { total: 0, pending: 0, paid: 0 }
  }
  
  const total = referrals.reduce((sum, r) => sum + Number(r.bonus_amount || 0), 0)
  const pending = referrals
    .filter(r => r.bonus_status === 'pending')
    .reduce((sum, r) => sum + Number(r.bonus_amount || 0), 0)
  const paid = referrals
    .filter(r => r.bonus_status === 'paid')
    .reduce((sum, r) => sum + Number(r.bonus_amount || 0), 0)
  
  return { total, pending, paid }
}

/**
 * Pay referral bonus (called when referred school is approved)
 */
export async function payReferralBonus(
  referralId: string
): Promise<{ success: boolean; transferId?: string; error?: string }> {
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return { success: false, error: 'Admin client not available' }
  }
  
  // Get referral details
  const { data: referral } = await adminSupabase
    .from('school_referrals')
    .select(`
      id,
      referring_school_id,
      bonus_amount,
      referring_school:high_schools!school_referrals_referring_school_id_fkey(stripe_account_id)
    `)
    .eq('id', referralId)
    .maybeSingle()
  
  if (!referral) {
    return { success: false, error: 'Referral not found' }
  }
  
  if (referral.bonus_status === 'paid') {
    return { success: true, transferId: referral.stripe_transfer_id || undefined }
  }
  
  const school = referral.referring_school as any
  if (!school?.stripe_account_id) {
    return { success: false, error: 'School does not have Stripe account set up' }
  }
  
  try {
    // Create transfer to school's Stripe account
    const transfer = await stripe.transfers.create({
      amount: Math.round(Number(referral.bonus_amount) * 100), // Convert to cents
      currency: 'usd',
      destination: school.stripe_account_id,
      metadata: {
        referral_id: referralId,
        type: 'referral_bonus',
      },
    })
    
    // Update referral record
    const { error: updateError } = await adminSupabase
      .from('school_referrals')
      .update({
        bonus_status: 'paid',
        bonus_paid_at: new Date().toISOString(),
        stripe_transfer_id: transfer.id,
      })
      .eq('id', referralId)
    
    if (updateError) {
      return { success: false, error: updateError.message }
    }
    
    // Send notification to school
    // TODO: Get admin user IDs and send notification
    
    return { success: true, transferId: transfer.id }
  } catch (error: any) {
    console.error('Error paying referral bonus:', error)
    return { success: false, error: error.message || 'Failed to pay referral bonus' }
  }
}

