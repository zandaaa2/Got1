'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthButtons from '@/components/auth/AuthButtons'
import { createClient } from '@/lib/supabase-client'
import { useEffect } from 'react'

export default function TestNotificationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        supabase
          .from('profiles')
          .select('id, avatar_url, full_name, username')
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data }) => setProfile(data))
      }
    })
  }, [])

  const handleCreateAllNotifications = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/test/notifications/all')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create notifications')
      }

      setResult(data)
      
      // Refresh notifications page after 1 second
      setTimeout(() => {
        router.push('/notifications')
      }, 1000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar activePage="notifications" />
        <DynamicLayout header={<AuthButtons />}>
          <div className="pt-8">
            <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-8">
              Test Notifications
            </h1>
            <p className="text-gray-600">Please sign in to test notifications.</p>
          </div>
        </DynamicLayout>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="notifications" />
      <DynamicLayout header={null}>
        <div className="pt-8">
          <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-8">
            Test Notifications
          </h1>

          <div className="space-y-6">
            <div className="surface-card p-6 rounded-2xl">
              <h2 className="text-lg font-semibold text-black mb-4">
                Create All Notification Types
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                This will create one notification of each type for testing purposes.
                You'll be redirected to the notifications page after creation.
              </p>

              <button
                onClick={handleCreateAllNotifications}
                disabled={loading}
                className="interactive-press bg-blue-600 text-white px-6 py-3 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Notifications...' : 'Create All Test Notifications'}
              </button>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">Error: {error}</p>
                </div>
              )}

              {result && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 font-semibold mb-2">
                    ✅ {result.message}
                  </p>
                  <p className="text-xs text-green-600">
                    Created {result.successful} of {result.total} notifications
                    {result.failed > 0 && ` (${result.failed} failed)`}
                  </p>
                </div>
              )}
            </div>

            <div className="surface-card p-6 rounded-2xl">
              <h2 className="text-lg font-semibold text-black mb-4">
                Notification Types
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-black mb-2">Evaluation (5)</h3>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>evaluation_requested</li>
                    <li>evaluation_confirmed</li>
                    <li>evaluation_denied</li>
                    <li>evaluation_completed</li>
                    <li>evaluation_cancelled</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-black mb-2">Scout Application (2)</h3>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>scout_application_approved</li>
                    <li>scout_application_denied</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-black mb-2">Payment (2)</h3>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>payment_received</li>
                    <li>payment_failed</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-black mb-2">User Account (4)</h3>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>user_signed_up</li>
                    <li>user_signed_in</li>
                    <li>user_converted_to_player</li>
                    <li>user_converted_to_basic</li>
                  </ul>
                </div>
                {profile?.role === 'scout' && (
                  <div>
                    <h3 className="font-medium text-black mb-2">Stripe/Account (2)</h3>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>stripe_account_issue</li>
                      <li>scout_ready_to_earn</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="surface-card p-6 rounded-2xl bg-amber-50 border border-amber-200">
              <h2 className="text-lg font-semibold text-black mb-2">
                ⚠️ Important: Database Migration Required
              </h2>
              <p className="text-sm text-gray-700 mb-2">
                Before testing, make sure you've run the database migration:
              </p>
              <code className="block text-xs bg-white p-3 rounded border border-amber-300 mt-2">
                add-new-notification-types.sql
              </code>
              <p className="text-xs text-gray-600 mt-3">
                This adds support for the 6 new notification types (user_signed_up, user_signed_in, 
                user_converted_to_player, user_converted_to_basic, stripe_account_issue, scout_ready_to_earn).
              </p>
            </div>
          </div>
        </div>
      </DynamicLayout>
    </div>
  )
}

