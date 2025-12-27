'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ClaimForm() {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim()) {
      setError('Please enter a message')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/claim/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit claim')
      }

      setSuccess(true)
      setMessage('')
      
      // Redirect to profile after a short delay
      setTimeout(() => {
        router.push('/profile')
      }, 2000)
    } catch (err: any) {
      console.error('❌ Error submitting claim:', err)
      setError(err.message || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="claim-message" className="block text-sm font-medium text-gray-700 mb-2">
          Message
        </label>
        <textarea
          id="claim-message"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          placeholder="Please describe why you're making this claim and what resolution you're seeking..."
          disabled={submitting}
        />
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Success: </strong>
          <span className="block sm:inline">Your claim has been submitted successfully. Redirecting...</span>
        </div>
      )}
      
      <button
        type="submit"
        disabled={submitting || success}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : 'Submit Claim'}
      </button>
    </form>
  )
}

