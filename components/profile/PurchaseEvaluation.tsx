'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import VerificationBadge from '@/components/shared/VerificationBadge'

interface PurchaseEvaluationProps {
  scout: any
  player: any
}

/**
 * Component for purchasing an evaluation from a scout.
 * Currently implements a simplified flow without payment processing.
 * 
 * @param scout - The scout profile to purchase from
 * @param player - The player profile making the purchase
 */
export default function PurchaseEvaluation({
  scout,
  player,
}: PurchaseEvaluationProps) {
  const [processing, setProcessing] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  /**
   * Handles the purchase of an evaluation.
   * Creates an evaluation record with 'pending' status.
   */
  const handlePurchase = async () => {
    try {
      setProcessing(true)

      // Get the scout's current price from database
      const { data: currentScout } = await supabase
        .from('profiles')
        .select('price_per_eval')
        .eq('id', scout.id)
        .maybeSingle()

      const price = currentScout?.price_per_eval || scout.price_per_eval || 99

      // Create evaluation (without payment processing for now)
      const response = await fetch('/api/evaluation/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scoutId: scout.id,
          price: price,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // If evaluation already exists, redirect to it
        if (data.evaluationId) {
          router.push(`/evaluations/${data.evaluationId}`)
          return
        }
        // Show detailed error message
        const errorMsg = data.error || 'Failed to create evaluation'
        const details = data.details ? ` (${data.details})` : ''
        const hint = data.hint ? `\n\nHint: ${data.hint}` : ''
        const code = data.code ? `\nCode: ${data.code}` : ''
        throw new Error(errorMsg + details + code + hint)
      }

      if (data.success && data.evaluationId) {
        // Redirect to the evaluation page
        router.push(`/evaluations/${data.evaluationId}`)
      } else {
        throw new Error('Failed to create evaluation')
      }
    } catch (error: any) {
      console.error('Error purchasing evaluation:', error)
      alert(error.message || 'Failed to purchase evaluation. Please try again.')
      setProcessing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-black hover:opacity-70"
      >
        <svg
          className="w-6 h-6"
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
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-6">
          Purchase Evaluation
        </h1>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
              {scout.avatar_url ? (
                <Image
                  src={scout.avatar_url}
                  alt={scout.full_name || 'Scout'}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-600 text-xl font-semibold">
                    {scout.full_name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h2 className="font-bold text-black text-lg flex items-center gap-2">
                {scout.full_name || 'Unknown Scout'}
                <VerificationBadge />
              </h2>
              <p className="text-black text-sm">{scout.organization || 'Scout'}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-black">Evaluation Service</span>
              <span className="font-bold text-black">
                ${scout.price_per_eval ? scout.price_per_eval.toFixed(2) : '99.00'}
              </span>
            </div>
            {scout.turnaround_time && (
              <p className="text-sm text-gray-600">{scout.turnaround_time}</p>
            )}
          </div>
        </div>

        <button
          onClick={handlePurchase}
          disabled={processing}
          className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
        >
          {processing ? 'Processing...' : 'Request Evaluation'}
        </button>
      </div>
    </div>
  )
}

