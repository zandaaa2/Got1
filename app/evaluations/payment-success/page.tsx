'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [evaluationId, setEvaluationId] = useState<string | null>(null)

  useEffect(() => {
    const createEvaluation = async () => {
      if (!sessionId) {
        setError('Missing session ID')
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        
        // Get the current user
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/auth/signin')
          return
        }

        console.log('🔍 Immediately creating evaluation for session:', sessionId)

        // IMMEDIATELY create evaluation via test-webhook endpoint (synchronous, <2 seconds)
        // This bypasses webhook delays and ensures evaluation is created within 2 seconds
        const response = await fetch('/api/debug/test-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id: sessionId }),
          cache: 'no-store',
        })

        const data = await response.json()

        if (data.evaluation?.id) {
          // Evaluation created successfully
          console.log('✅ Evaluation created immediately:', data.evaluation.id)
          setEvaluationId(data.evaluation.id)
          setLoading(false)
          // Redirect immediately (under 2 seconds total)
          router.push('/my-evals')
        } else if (data.message === 'Evaluation already exists' || data.action === 'found_existing') {
          // Evaluation already exists (webhook processed it first - rare but possible)
          console.log('✅ Evaluation already exists, finding it...')
          
          // Try to find it by session
          const findResponse = await fetch(`/api/evaluation/find-by-session?session_id=${sessionId}`, {
            cache: 'no-store',
          })
          
          if (findResponse.ok) {
            const findData = await findResponse.json()
            if (findData.evaluationId) {
              setEvaluationId(findData.evaluationId)
              setLoading(false)
              router.push('/my-evals')
              return
            }
          }
          
          // If we can't find it, still redirect (it exists, just can't locate it immediately)
          // Real-time subscription will pick it up
          setLoading(false)
          router.push('/my-evals')
        } else {
          // Error creating evaluation
          console.error('❌ Failed to create evaluation:', data.error || data)
          setError('Failed to process evaluation. Redirecting...')
          setLoading(false)
          // Still redirect to my-evals (user can see status there)
          setTimeout(() => router.push('/my-evals'), 1000)
        }
      } catch (err: any) {
        console.error('Error processing payment:', err)
        setError('An error occurred. Redirecting...')
        setLoading(false)
        // Always redirect, even on error
        setTimeout(() => router.push('/my-evals'), 1000)
      }
    }

    createEvaluation()
  }, [sessionId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Processing your payment...</p>
          <p className="text-sm text-gray-500 mt-2">This should only take a moment</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Payment Processing</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => router.push('/my-evals')}
            className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Go to My Evaluations
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-green-600 text-5xl mb-4">✓</div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-gray-700">Redirecting to your evaluation...</p>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}

