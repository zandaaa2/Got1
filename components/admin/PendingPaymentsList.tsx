'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getGradientForId } from '@/lib/gradients'

interface PendingPaymentsListProps {
  referrals: any[]
}

export default function PendingPaymentsList({ referrals }: PendingPaymentsListProps) {
  const [processing, setProcessing] = useState<string | null>(null)
  const router = useRouter()

  const handleProcessPayment = async (referralId: string, amount: number) => {
    if (!confirm(`Process payment of $${amount} to referrer?`)) {
      return
    }

    setProcessing(referralId)
    try {
      const response = await fetch(`/api/admin/referrals/${referralId}/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_amount: amount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process payment')
      }

      alert(`Payment of $${amount} processed successfully!`)
      router.refresh()
    } catch (error: any) {
      console.error('Error processing payment:', error)
      alert(error.message || 'Failed to process payment')
    } finally {
      setProcessing(null)
    }
  }

  if (referrals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No pending referral payments.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {referrals.map((referral) => {
        const referred = referral.referred
        const referrer = referral.referrer
        const referralId = referral.id

        // Check onboarding completion
        const onboardingComplete = 
          referred?.onboarding_completed_at &&
          referred?.offer_changed_from_default &&
          referred?.profile_link_in_bio

        return (
          <div
            key={referralId}
            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Referred Scout Info */}
              <div>
                <h3 className="font-bold text-black mb-3">New Scout</h3>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Name:</strong> {referred?.full_name || 'Unknown'}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Username:</strong> @{referred?.username || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Current Price:</strong> ${referred?.price_per_eval || 'N/A'}
                </p>
                <div className="mt-3 space-y-1">
                  <p className={`text-sm ${referred?.offer_changed_from_default ? 'text-green-600' : 'text-red-600'}`}>
                    ✓ Offer Changed: {referred?.offer_changed_from_default ? 'Yes' : 'No'}
                  </p>
                  <p className={`text-sm ${referred?.profile_link_in_bio ? 'text-green-600' : 'text-red-600'}`}>
                    ✓ Profile Link in Bio: {referred?.profile_link_in_bio ? 'Yes' : 'No'}
                  </p>
                  <p className={`text-sm ${onboardingComplete ? 'text-green-600' : 'text-yellow-600'}`}>
                    ✓ Onboarding Complete: {onboardingComplete ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              {/* Referrer Info */}
              <div>
                <h3 className="font-bold text-black mb-3">Referrer</h3>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Name:</strong> {referrer?.full_name || 'Unknown'}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Username:</strong> @{referrer?.username || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Stripe Account:</strong> {referrer?.stripe_account_id ? 'Connected' : 'Not Connected'}
                </p>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleProcessPayment(referralId, 45)}
                disabled={processing === referralId}
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {processing === referralId ? 'Processing...' : 'Pay $45 (< 10k)'}
              </button>
              <button
                onClick={() => handleProcessPayment(referralId, 65)}
                disabled={processing === referralId}
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {processing === referralId ? 'Processing...' : 'Pay $65 (10k-100k)'}
              </button>
              <button
                onClick={() => handleProcessPayment(referralId, 125)}
                disabled={processing === referralId}
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {processing === referralId ? 'Processing...' : 'Pay $125 (> 100k)'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

