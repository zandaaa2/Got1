'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'

export default function AccountOwnershipContent() {
  const router = useRouter()
  const supabase = createClient()
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleDownloadData = async (format: 'json' | 'pdf' = 'json') => {
    setDownloading(true)
    setError(null)
    setSuccess(null)

    try {
      // API route handles authentication server-side using cookies
      const response = await fetch(`/api/user/export-data?format=${format}`, {
        method: 'GET',
        credentials: 'include', // Ensure cookies are sent
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to export data' }))
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page and try again.')
        }
        throw new Error(errorData.error || 'Failed to export data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const extension = format === 'pdf' ? 'pdf' : 'json'
      a.download = `got1-data-export-${new Date().toISOString().split('T')[0]}.${extension}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSuccess(`Your data has been downloaded as ${format.toUpperCase()}!`)
    } catch (err: any) {
      console.error('Error downloading data:', err)
      setError(err.message || 'Failed to download data. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type "DELETE" to confirm')
      return
    }

    setDeleting(true)
    setError(null)

    try {
      // API route handles authentication server-side using cookies
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        credentials: 'include', // Ensure cookies are sent
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete account' }))
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page and try again.')
        }
        throw new Error(errorData.error || 'Failed to delete account')
      }

      // Sign out and redirect to home
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (err: any) {
      console.error('Error deleting account:', err)
      setError(err.message || 'Failed to delete account. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/profile"
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← Back to Profile
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-black mb-2">Account Ownership</h1>
        <p className="text-gray-600">
          Manage your account data and ownership settings
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Download Data Section */}
      <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg">
        <h2 className="text-xl font-bold text-black mb-2">Download Your Data</h2>
        <p className="text-gray-600 mb-4">
          Download a copy of all your personal data stored on Got1. This includes your profile information, 
          evaluation history, and account settings. Available in both JSON and PDF formats.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => handleDownloadData('json')}
            disabled={downloading}
            className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? 'Preparing...' : 'Download JSON'}
          </button>
          <button
            onClick={() => handleDownloadData('pdf')}
            disabled={downloading}
            className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? 'Preparing...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Delete Account Section */}
      <div className="mb-8 p-6 bg-white border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold text-red-600 mb-2">Delete Account</h2>
        <p className="text-gray-600 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone. 
          All your evaluations, profile information, and account history will be permanently removed.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          <strong>Warning:</strong> This will delete all your data including:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600 mb-6 space-y-1">
          <li>Your profile and personal information</li>
          <li>All evaluation requests and completed evaluations</li>
          <li>Payment history and transaction records</li>
          <li>Scout application status (if applicable)</li>
        </ul>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
          >
            Delete My Account
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Confirm Deletion'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                  setError(null)
                }}
                disabled={deleting}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

