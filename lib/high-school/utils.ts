/**
 * Client-safe utility functions for high school features
 * These functions don't require server-only imports and can be used in client components
 */

/**
 * Check if the referral feature is currently active
 * The referral feature is active until the end of February 2025
 * TODO: Update cutoff date when feature should expire
 */
export function isReferralFeatureActive(): boolean {
  // Always show for now - update date when feature should expire
  const cutoffDate = new Date('2026-02-28T23:59:59Z')
  return new Date() < cutoffDate
}

