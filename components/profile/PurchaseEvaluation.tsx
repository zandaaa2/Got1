'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { loadStripe } from '@stripe/stripe-js'
import { getGradientForId } from '@/lib/gradients'
import VerificationBadge from '@/components/shared/VerificationBadge'

interface PurchaseEvaluationProps {
  scout: any
  player: any
}

// Initialize Stripe - only if key exists
const getStripeKey = () => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) {
    console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
    return null
  }
  return key
}

const stripePromise = getStripeKey() ? loadStripe(getStripeKey()!) : null

/**
 * Component for purchasing an evaluation from a scout.
 * Uses Stripe Checkout for payment processing.
 * 
 * @param scout - The scout profile to purchase from
 * @param player - The player profile making the purchase
 */
export default function PurchaseEvaluation({
  scout,
  player,
}: PurchaseEvaluationProps) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  /**
   * Handles the request for an evaluation (no payment yet).
   * Creates an evaluation request, waits for scout to confirm/deny.
   * Payment will be charged when scout confirms.
   */
  const handlePurchase = async () => {
    try {
      setProcessing(true)
      setError(null)

      const publishableKey = getStripeKey()
      if (!publishableKey || !stripePromise) {
        throw new Error('Payments are temporarily unavailable. Please contact support.')
      }

      const stripe = await stripePromise

      if (!stripe) {
        throw new Error('Failed to load Stripe.js. Please disable blockers or try again later.')
      }

      // Get the scout's current price from database
      const { data: currentScout } = await supabase
        .from('profiles')
        .select('price_per_eval')
        .eq('id', scout.id)
        .maybeSingle()

      const price = currentScout?.price_per_eval ?? scout.price_per_eval
      if (!price) {
        throw new Error('Scout price is not configured. Please ask the scout to set a price.')
      }

      console.log('Creating evaluation with upfront payment...')
      
      // Create evaluation request WITH Stripe checkout
      const response = await fetch('/api/evaluation/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scoutId: scout.id,
          price,
        }),
      })

      const data = await response.json()

      console.log('Evaluation create response:', { ok: response.ok, data })

      if (!response.ok) {
        // If evaluation already exists, redirect to it
        if (data.evaluationId) {
          router.push(`/evaluations/${data.evaluationId}`)
          return
        }
        throw new Error(data.error || 'Failed to create evaluation request')
      }

      if (!data.sessionId) {
        console.error('No sessionId in response:', data)
        throw new Error('No Stripe session returned. Please check the server logs.')
      }

      console.log('Redirecting to Stripe checkout...', data.sessionId)
      
      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      })

      if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (error: any) {
      console.error('Error requesting evaluation:', error)
      setError(error.message || 'Failed to request evaluation. Please try again.')
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
            <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
              {scout.avatar_url ? (
                <Image
                  src={scout.avatar_url}
                  alt={scout.full_name || 'Scout'}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-xl font-semibold text-white ${getGradientForId(scout.id)}`}>
                  {scout.full_name?.charAt(0).toUpperCase() || '?'}
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

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <button
          onClick={handlePurchase}
          disabled={processing}
          className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
        >
          {processing ? 'Processing...' : `Request Evaluation - $${scout.price_per_eval || 99}`}
        </button>
        <p className="text-sm text-gray-600 mt-2 text-center">
          Payment is charged immediately and held in escrow. Full refund if scout denies.
        </p>
      </div>
    </div>
  )
}

