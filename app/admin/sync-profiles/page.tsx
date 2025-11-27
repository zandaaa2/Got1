'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SyncProfilesPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [fixingSpecific, setFixingSpecific] = useState(false)
  const router = useRouter()

  const specificEmails = [
    'izikduran08@gmail.com',
    'tylertarpley@gmail.com', // Update with actual email if different
    'gshazel28@gmail.com',
    'jayjohnsonjr7@yahoo.com',
    'kingstonbeyer3@gmail.com',
  ]

  const handleSync = async () => {
    if (!confirm('This will sync all profiles from auth.users. Continue?')) {
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setFixingSpecific(false)

    try {
      const response = await fetch('/api/admin/sync-profiles-from-auth', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Failed to sync profiles')
    } finally {
      setLoading(false)
    }
  }

  const handleFixSpecific = async () => {
    if (!confirm(`This will fix the 5 specific players:\n${specificEmails.join('\n')}\n\nContinue?`)) {
      return
    }

    setFixingSpecific(true)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/admin/fix-specific-players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emails: specificEmails }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fix failed')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fix players')
    } finally {
      setLoading(false)
      setFixingSpecific(false)
    }
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">Sync Profiles from Auth</h1>
          <p className="text-gray-600">
            This will update all profiles with missing names/avatars from auth.users metadata.
            This is a one-time operation to fix existing players.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div>
            <button
              onClick={handleSync}
              disabled={loading}
              className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && !fixingSpecific ? 'Syncing...' : 'Sync All Profiles'}
            </button>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-black mb-2">Fix Specific Players</h3>
            <p className="text-sm text-gray-600 mb-3">
              Fix these 5 players whose full_name is set to username:
            </p>
            <ul className="text-sm text-gray-700 mb-4 list-disc list-inside">
              {specificEmails.map((email, idx) => (
                <li key={idx}>{email}</li>
              ))}
            </ul>
            <button
              onClick={handleFixSpecific}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && fixingSpecific ? 'Fixing...' : 'Fix These 5 Players'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-bold text-red-800 mb-2">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-bold text-green-800 mb-2">
                {result.summary ? 'Fix Complete!' : 'Sync Complete!'}
              </h3>
              {result.summary ? (
                <div className="text-green-700 space-y-1">
                  <p><strong>Total:</strong> {result.summary.total}</p>
                  <p><strong>Updated:</strong> {result.summary.updated}</p>
                  <p><strong>Skipped:</strong> {result.summary.skipped}</p>
                  {result.summary.failed > 0 && (
                    <p className="text-orange-700"><strong>Failed:</strong> {result.summary.failed}</p>
                  )}
                </div>
              ) : (
                <div className="text-green-700 space-y-1">
                  <p><strong>Total profiles:</strong> {result.total}</p>
                  <p><strong>Updated:</strong> {result.updated}</p>
                  <p><strong>Skipped:</strong> {result.skipped}</p>
                  {result.errors > 0 && (
                    <p className="text-orange-700"><strong>Errors:</strong> {result.errors}</p>
                  )}
                </div>
              )}
              
              {result.results && result.results.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold mb-2">Results by player:</p>
                  <ul className="space-y-2 text-sm">
                    {result.results.map((r: any, idx: number) => (
                      <li key={idx} className="border-b pb-2">
                        <strong>{r.email}:</strong>{' '}
                        {r.updated ? (
                          <span className="text-green-700">
                            ✓ Updated - {r.after?.full_name || 'name'} 
                            {r.after?.avatar_url && ' (avatar)'}
                          </span>
                        ) : r.error ? (
                          <span className="text-red-700">✗ Error: {r.error}</span>
                        ) : (
                          <span className="text-yellow-700">
                            ⚠ {r.reason || 'Skipped'}
                            {!r.authNameFound && ' (display name not found in auth.users)'}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.updates && result.updates.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold mb-2">Sample updates:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {result.updates.slice(0, 10).map((update: any, idx: number) => (
                      <li key={idx}>
                        {update.full_name && `Name: ${update.full_name}`}
                        {update.avatar_url && ` Avatar: ✓`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.updated === 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> No profiles were updated. This could mean:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm text-yellow-700">
                    <li>All profiles already have names/avatars</li>
                    <li>Names/avatars don't exist in auth.users metadata</li>
                    <li>Check server logs for detailed information</li>
                  </ul>
                </div>
              )}
              {result.updated > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-blue-800 text-sm font-semibold mb-2">⚠️ Important:</p>
                  <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                    <li>Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+R) to see updated names</li>
                    <li>Check server console logs for detailed sync information</li>
                    <li>If names still don't show, the data might not be in auth.users user_metadata</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={() => router.push('/admin/scout-applications')}
            className="text-gray-600 hover:text-black underline"
          >
            ← Back to Admin
          </button>
        </div>
      </div>
    </div>
  )
}

