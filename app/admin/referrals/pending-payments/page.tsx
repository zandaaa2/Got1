import { createServerClient } from '@/lib/supabase'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import PendingPaymentsList from '@/components/admin/PendingPaymentsList'
import AdminReferralNav from '@/components/admin/AdminReferralNav'

export const dynamic = 'force-dynamic'

export default async function PendingPaymentsPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  const userIsAdmin = await isAdmin(session.user.id)
  if (!userIsAdmin) {
    redirect('/browse')
  }

  const adminSupabase = createAdminClient()

  if (!adminSupabase) {
    throw new Error('Supabase admin client is not configured')
  }

  // Get referrals awaiting payment (use admin client to bypass RLS)
  const { data: referrals, error: referralsError } = await adminSupabase
    .from('referrals')
    .select('*')
    .eq('payment_status', 'pending_admin_review')
    .order('created_at', { ascending: false })

  // Get profiles for referrers and referred users
  let referralsWithProfiles = referrals || []
  if (referrals && referrals.length > 0) {
    const referrerIds = referrals.map(r => r.referrer_id).filter(Boolean) as string[]
    const referredIds = referrals.map(r => r.referred_id).filter(Boolean) as string[]
    const combinedIds = referrerIds.concat(referredIds)
    // Remove duplicates
    const allUserIds = combinedIds.filter((id, index) => combinedIds.indexOf(id) === index)

    if (allUserIds.length > 0) {
      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url, stripe_account_id, x_followers_count, profile_link_in_bio, offer_changed_from_default, onboarding_completed_at, price_per_eval')
        .in('user_id', allUserIds)

      // Join profiles with referrals
      referralsWithProfiles = referrals.map(ref => ({
        ...ref,
        referrer: profiles?.find(p => p.user_id === ref.referrer_id) || null,
        referred: profiles?.find(p => p.user_id === ref.referred_id) || null,
      }))
    }
  }

  return (
    <div className="min-h-screen bg-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-black">Pending Referral Payments</h1>
          <AdminReferralNav active="pending" />
        </div>
        {referralsError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <h3 className="font-bold text-red-800 mb-2">Error Loading Referrals</h3>
            <p className="text-red-700 text-sm">{referralsError.message}</p>
          </div>
        )}
        <PendingPaymentsList referrals={referralsWithProfiles || []} />
      </div>
    </div>
  )
}

