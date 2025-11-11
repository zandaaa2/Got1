'use client'

import { useState, useId } from 'react'

export default function FeatureRequest() {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()
  const errorId = `${inputId}-error`
  const successId = `${inputId}-success`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim()) {
      setError('Please enter a feature request')
      return
    }

    if (message.length > 80) {
      setError('Message must be 80 characters or less')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      console.log('📧 Submitting feature request:', message.trim())
      
      const response = await fetch('/api/feature-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message.trim() }),
      })

      console.log('📧 Response status:', response.status)
      console.log('📧 Response ok:', response.ok)

      const responseData = await response.json()
      console.log('📧 Response data:', responseData)

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to submit feature request')
      }

      console.log('✅ Feature request submitted successfully')
      setSuccess(true)
      setMessage('')
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err: any) {
      console.error('❌ Error submitting feature request:', err)
      setError(err.message || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="hidden md:flex items-center gap-3 relative"
    >
      <div className="relative flex items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          Share a feature request
        </label>
        <input
          id={inputId}
          type="text"
          value={message}
          onChange={(e) => {
            const newValue = e.target.value
            if (newValue.length <= 80) {
              setMessage(newValue)
              setError(null)
            }
          }}
          placeholder="type feature request"
          maxLength={80}
          className="h-10 w-48 md:w-64 rounded-full border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-300 focus:bg-white focus:outline-none transition-colors"
          disabled={submitting}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : success ? successId : undefined}
        />
        {message.trim() && (
          <button
            type="submit"
            disabled={submitting}
            className="interactive-press inline-flex items-center justify-center h-10 px-4 rounded-full bg-black text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '...' : success ? '✓' : 'Send'}
          </button>
        )}
      </div>
      {error && (
        <div
          id={errorId}
          role="alert"
          className="absolute top-full left-0 mt-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded border border-red-200 whitespace-nowrap z-50"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          id={successId}
          role="status"
          aria-live="polite"
          className="absolute top-full left-0 mt-1 px-3 py-2 text-xs bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 whitespace-nowrap z-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Request sent to founder!</span>
        </div>
      )}
    </form>
  )
}

