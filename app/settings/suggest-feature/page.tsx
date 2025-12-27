'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'

export default function SuggestFeaturePage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [featureTitle, setFeatureTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      if (!currentSession) {
        router.replace('/welcome')
        return
      }

      setSession(currentSession)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const response = await fetch('/api/feature-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          featureTitle: featureTitle.trim(),
          description: description.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feature request')
      }

      setShowSuccess(true)

      setTimeout(() => {
        router.push('/settings')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting your request')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-lg font-medium text-gray-900">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="profile" />
      <DynamicLayout header={null}>
        <main className="pt-6 md:pt-10 pb-12">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/settings"
              className="inline-flex items-center text-black hover:opacity-70 mb-6 transition-opacity"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl md:text-3xl font-normal text-black mb-8">
              Suggest a Feature
            </h1>
            
            {showSuccess ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-75"></div>
                    <div className="relative w-20 h-20 rounded-full bg-green-500 flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h2>
                  <p className="text-gray-600 text-center mb-4">
                    Your feature request has been submitted successfully.
                  </p>
                  <p className="text-sm text-gray-500">
                    Redirecting to settings...
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
                <p className="text-gray-600 mb-6">
                  We'd love to hear your ideas! Share your feature suggestions below and help us improve Got1.
                </p>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}
                  <div>
                    <label htmlFor="feature-title" className="block text-sm font-medium text-gray-700 mb-2">
                      Feature Title
                    </label>
                    <input
                      type="text"
                      id="feature-title"
                      required
                      value={featureTitle}
                      onChange={(e) => setFeatureTitle(e.target.value)}
                      disabled={submitting}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Brief description of your feature idea"
                    />
                  </div>
                  <div>
                    <label htmlFor="feature-description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="feature-description"
                      rows={6}
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={submitting}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Tell us more about your feature idea and how it would help..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !featureTitle.trim() || !description.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Suggestion'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </main>
      </DynamicLayout>
    </div>
  )
}











