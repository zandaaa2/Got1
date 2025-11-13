'use client'

import { useEffect } from 'react'

/**
 * Error boundary component for the whats-this page.
 * Catches errors that occur when viewing the whats-this page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Whats-this page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center max-w-md mx-4">
        <h2 className="text-2xl font-bold text-black mb-4">Something went wrong!</h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'An error occurred while loading this page.'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

