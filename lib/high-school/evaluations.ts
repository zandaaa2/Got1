import { createServerClient } from '@/lib/supabase'
import { createAdminClient } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications'

/**
 * Request school payment for an evaluation
 */
export async function requestSchoolPayment(
  evaluationId: string,
  schoolId: string,
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return { success: false, error: 'Admin client not available' }
  }
  
  // Create high_school_evaluation record with paid_by = 'school', status = 'requested'
  const { error } = await adminSupabase
    .from('high_school_evaluations')
    .insert({
      high_school_id: schoolId,
      evaluation_id: evaluationId,
      player_id: playerId,
      paid_by: 'school',
    })
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  // Send notification to admins
  const { data: admins } = await adminSupabase
    .from('high_school_admins')
    .select('user_id')
    .eq('high_school_id', schoolId)
  
  if (admins) {
    for (const admin of admins) {
      await createNotification({
        userId: admin.user_id,
        type: 'school_payment_requested',
        title: 'Evaluation Payment Requested',
        message: 'A player has requested the school to pay for an evaluation.',
        link: `/high-school/${schoolId}/evaluations`,
        metadata: {
          school_id: schoolId,
          evaluation_id: evaluationId,
          player_id: playerId,
        },
      })
    }
  }
  
  return { success: true }
}

/**
 * Confirm school payment (admin approves)
 */
export async function confirmSchoolPayment(
  evaluationId: string,
  schoolId: string,
  confirmedBy: string
): Promise<{ success: boolean; error?: string }> {
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return { success: false, error: 'Admin client not available' }
  }
  
  // Get evaluation details
  const { data: evalRecord } = await adminSupabase
    .from('high_school_evaluations')
    .select('player_id, evaluation:evaluations(*)')
    .eq('evaluation_id', evaluationId)
    .eq('high_school_id', schoolId)
    .maybeSingle()
  
  if (!evalRecord || !evalRecord.evaluation) {
    return { success: false, error: 'Evaluation not found' }
  }
  
  // TODO: Create Stripe payment from school's account
  // For now, just update the record and send notifications
  
  // Send notification to player
  await createNotification({
    userId: evalRecord.player_id,
    type: 'school_payment_accepted',
    title: 'School Payment Accepted',
    message: 'Your school has approved payment for your evaluation request.',
    link: `/evaluations/${evaluationId}`,
    metadata: {
      school_id: schoolId,
      evaluation_id: evaluationId,
      confirmed_by: confirmedBy,
    },
  })
  
  // Notify other admin if exists
  const { data: otherAdmin } = await adminSupabase
    .from('high_school_admins')
    .select('user_id')
    .eq('high_school_id', schoolId)
    .neq('user_id', confirmedBy)
    .maybeSingle()
  
  if (otherAdmin) {
    await createNotification({
      userId: otherAdmin.user_id,
      type: 'admin_accepted',
      title: 'Payment Request Accepted',
      message: 'Your co-admin has accepted a payment request.',
      link: `/high-school/${schoolId}/evaluations`,
      metadata: {
        school_id: schoolId,
        evaluation_id: evaluationId,
        accepted_by: confirmedBy,
      },
    })
  }
  
  return { success: true }
}

/**
 * Deny school payment (admin denies)
 */
export async function denySchoolPayment(
  evaluationId: string,
  schoolId: string,
  deniedBy: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return { success: false, error: 'Admin client not available' }
  }
  
  // Get evaluation details
  const { data: evalRecord } = await adminSupabase
    .from('high_school_evaluations')
    .select('player_id')
    .eq('evaluation_id', evaluationId)
    .eq('high_school_id', schoolId)
    .maybeSingle()
  
  if (!evalRecord) {
    return { success: false, error: 'Evaluation not found' }
  }
  
  // Delete the high_school_evaluation record
  await adminSupabase
    .from('high_school_evaluations')
    .delete()
    .eq('evaluation_id', evaluationId)
    .eq('high_school_id', schoolId)
  
  // Send notification to player
  await createNotification({
    userId: evalRecord.player_id,
    type: 'school_payment_denied',
    title: 'School Payment Denied',
    message: reason 
      ? `Your school has denied payment for your evaluation. Reason: ${reason}`
      : 'Your school has denied payment for your evaluation. You can still pay for it yourself.',
    link: `/evaluations/${evaluationId}`,
    metadata: {
      school_id: schoolId,
      evaluation_id: evaluationId,
      denied_by: deniedBy,
      reason: reason || null,
    },
  })
  
  // Notify other admin if exists
  const { data: otherAdmin } = await adminSupabase
    .from('high_school_admins')
    .select('user_id')
    .eq('high_school_id', schoolId)
    .neq('user_id', deniedBy)
    .maybeSingle()
  
  if (otherAdmin) {
    await createNotification({
      userId: otherAdmin.user_id,
      type: 'admin_denied',
      title: 'Payment Request Denied',
      message: 'Your co-admin has denied a payment request.',
      link: `/high-school/${schoolId}/evaluations`,
      metadata: {
        school_id: schoolId,
        evaluation_id: evaluationId,
        denied_by: deniedBy,
      },
    })
  }
  
  return { success: true }
}

/**
 * Cancel school-paid evaluation (school cancels on behalf of player)
 */
export async function cancelSchoolEval(
  evaluationId: string,
  schoolId: string,
  cancelledBy: string
): Promise<{ success: boolean; error?: string }> {
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return { success: false, error: 'Admin client not available' }
  }
  
  // Get evaluation details
  const { data: evalRecord } = await adminSupabase
    .from('high_school_evaluations')
    .select('player_id, paid_by')
    .eq('evaluation_id', evaluationId)
    .eq('high_school_id', schoolId)
    .maybeSingle()
  
  if (!evalRecord) {
    return { success: false, error: 'Evaluation not found' }
  }
  
  // Only allow cancelling if school paid for it
  if (evalRecord.paid_by !== 'school') {
    return { success: false, error: 'Only school-paid evaluations can be cancelled by school' }
  }
  
  // Mark as cancelled
  await adminSupabase
    .from('high_school_evaluations')
    .update({ school_cancelled_at: new Date().toISOString() })
    .eq('evaluation_id', evaluationId)
    .eq('high_school_id', schoolId)
  
  // TODO: Process refund via Stripe
  
  // Send notification to player with option to pay themselves
  await createNotification({
    userId: evalRecord.player_id,
    type: 'school_eval_cancelled',
    title: 'Evaluation Cancelled by School',
    message: 'Your school cancelled your evaluation request. Would you like to pay for it yourself?',
    link: `/evaluations/${evaluationId}`,
    metadata: {
      school_id: schoolId,
      evaluation_id: evaluationId,
      cancelled_by: cancelledBy,
      can_pay_self: true,
    },
  })
  
  return { success: true }
}

/**
 * Share evaluation with school (player-paid eval)
 */
export async function shareEvalWithSchool(
  evaluationId: string,
  schoolId: string,
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return { success: false, error: 'Admin client not available' }
  }
  
  // Check if already shared
  const { data: existing } = await adminSupabase
    .from('high_school_evaluations')
    .select('id')
    .eq('evaluation_id', evaluationId)
    .eq('high_school_id', schoolId)
    .maybeSingle()
  
  if (existing) {
    // Already shared, just update shared_by_player flag
    await adminSupabase
      .from('high_school_evaluations')
      .update({ shared_by_player: true })
      .eq('id', existing.id)
    
    return { success: true }
  }
  
  // Create new record
  const { error } = await adminSupabase
    .from('high_school_evaluations')
    .insert({
      high_school_id: schoolId,
      evaluation_id: evaluationId,
      player_id: playerId,
      paid_by: 'player',
      shared_by_player: true,
    })
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

/**
 * Unshare evaluation from school (player-paid eval only)
 */
export async function unshareEvalFromSchool(
  evaluationId: string,
  schoolId: string,
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  const adminSupabase = createAdminClient()
  if (!adminSupabase) {
    return { success: false, error: 'Admin client not available' }
  }
  
  // Get evaluation record
  const { data: evalRecord } = await adminSupabase
    .from('high_school_evaluations')
    .select('paid_by, shared_by_player')
    .eq('evaluation_id', evaluationId)
    .eq('high_school_id', schoolId)
    .eq('player_id', playerId)
    .maybeSingle()
  
  if (!evalRecord) {
    return { success: false, error: 'Evaluation not shared with school' }
  }
  
  // Only allow unsharing if player paid themselves
  if (evalRecord.paid_by !== 'player') {
    return { success: false, error: 'Only player-paid evaluations can be unshared' }
  }
  
  // Delete the record
  const { error } = await adminSupabase
    .from('high_school_evaluations')
    .delete()
    .eq('evaluation_id', evaluationId)
    .eq('high_school_id', schoolId)
    .eq('player_id', playerId)
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true }
}


