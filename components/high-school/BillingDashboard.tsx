'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface BillingDashboardProps {
  school: any
}

export default function BillingDashboard({ school }: BillingDashboardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [accountStatus, setAccountStatus] = useState<any>(null)
  const [donationLink, setDonationLink] = useState(school.donation_link || '')
  const [generatingLink, setGeneratingLink] = useState(false)

  useEffect(() => {
    checkAccountStatus()
  }, [school.id])

  const checkAccountStatus = async () => {
    // Check if Stripe account exists
    if (school.stripe_account_id) {
      setAccountStatus({ hasAccount: true, accountId: school.stripe_account_id })
    } else {
      setAccountStatus({ hasAccount: false })
    }
  }

  const handleCreateStripe = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/high-school/${school.id}/billing/create-stripe`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create Stripe account')
      }

      await checkAccountStatus()
      alert('Stripe account created! Complete the onboarding to accept donations.')
    } catch (err: any) {
      alert(err.message || 'Failed to create Stripe account')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateDonationLink = async () => {
    setGeneratingLink(true)
    try {
      const response = await fetch(`/api/high-school/${school.id}/billing/donation-link`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate donation link')
      }

      setDonationLink(data.link)
      alert('Donation link generated!')
    } catch (err: any) {
      alert(err.message || 'Failed to generate donation link')
    } finally {
      setGeneratingLink(false)
    }
  }

  const copyDonationLink = async () => {
    if (!donationLink) return

    try {
      await navigator.clipboard.writeText(donationLink)
      alert('Donation link copied to clipboard!')
    } catch (err) {
      alert('Failed to copy link')
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-black mb-6">Billing & Donations</h1>

      {/* Stripe Connect Setup */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-black mb-4">Stripe Connect Account</h2>
        {!accountStatus?.hasAccount ? (
          <div>
            <p className="text-gray-600 mb-4">
              Set up a Stripe Connect account to accept donations and receive referral bonuses.
            </p>
            <button
              onClick={handleCreateStripe}
              disabled={loading}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Stripe Account'}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Stripe account connected: <span className="font-mono text-sm">{school.stripe_account_id}</span>
            </p>
            <p className="text-sm text-gray-500">
              Your Stripe account is set up and ready to receive donations.
            </p>
          </div>
        )}
      </div>

      {/* Donation Link */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-black mb-4">Donation Link</h2>
        {donationLink ? (
          <div>
            <p className="text-gray-600 mb-4">
              Share this link to allow supporters to donate to your school.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={donationLink}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
              />
              <button
                onClick={copyDonationLink}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Copy
              </button>
            </div>
            <a
              href={donationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Test donation link →
            </a>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Generate a donation link to allow supporters to donate to your school.
            </p>
            <button
              onClick={handleGenerateDonationLink}
              disabled={generatingLink || !accountStatus?.hasAccount}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generatingLink ? 'Generating...' : 'Generate Donation Link'}
            </button>
            {!accountStatus?.hasAccount && (
              <p className="text-sm text-gray-500 mt-2">
                You need to set up a Stripe Connect account first.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


