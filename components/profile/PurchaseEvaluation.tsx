'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { loadStripe } from '@stripe/stripe-js'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'
import VerificationBadge from '@/components/shared/VerificationBadge'
import SelectChildrenModal from '@/components/profile/SelectChildrenModal'
import { collegeEntries } from '@/lib/college-data'

interface PurchaseEvaluationProps {
  scout: any
  player: any | null // null if parent account
  isSignedIn?: boolean
  onSignInClick?: () => void
  onSignUpClick?: () => void
}

interface Child {
  id: string
  user_id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  school: string | null
  graduation_year: number | null
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

// Initialize Stripe with locale disabled to prevent localization errors
const stripePromise = getStripeKey() 
  ? loadStripe(getStripeKey()!, { locale: 'auto' }) 
  : null

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
  isSignedIn: isSignedInProp,
  onSignInClick,
  onSignUpClick,
}: PurchaseEvaluationProps) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showChildrenModal, setShowChildrenModal] = useState(false)
  const [isParent, setIsParent] = useState(false)
  const [parentId, setParentId] = useState<string | null>(null)
  const [isSignedInState, setIsSignedInState] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  // Use prop if provided, otherwise check internally
  const isSignedIn = isSignedInProp !== undefined ? isSignedInProp : isSignedInState

  useEffect(() => {
    // Check if user is signed in and if current user is a parent
    const checkUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsSignedInState(!!session)
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, user_id')
          .eq('user_id', session.user.id)
          .maybeSingle()
        
        if (profile?.role === 'parent') {
          setIsParent(true)
          setParentId(profile.user_id)
        }
      }
    }
    // Only check if prop not provided
    if (isSignedInProp === undefined) {
      checkUserRole()
    }
  }, [supabase, isSignedInProp])


  /**
   * Handles purchase for multiple children (parent account)
   */
  const handleMultiplePurchases = async (selectedChildren: Child[]) => {
    setShowChildrenModal(false)
    setProcessing(true)
    setError(null)

    try {
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

      // Create checkout sessions for all selected children
      const sessionIds: string[] = []
      const failed: string[] = []

      for (const child of selectedChildren) {
        try {
          const response = await fetch('/api/evaluation/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              scoutId: scout.id,
              price,
              playerId: child.id, // Pass the child's profile ID
            }),
          })

          const data = await response.json()

          if (!response.ok) {
            if (data.evaluationId) {
              // Evaluation already exists, skip this one
              console.log('Evaluation already exists for child:', child.id)
              continue
            }
            failed.push(child.full_name || 'child')
            continue
          }

          if (data.sessionId) {
            sessionIds.push(data.sessionId)
          }
        } catch (error: any) {
          console.error('Error creating evaluation for child:', error)
          failed.push(child.full_name || 'child')
        }
      }

      // Check if any failed
      if (failed.length > 0) {
        setError(`Failed to create evaluations for: ${failed.join(', ')}`)
        setProcessing(false)
        return
      }

      // Check if any succeeded
      if (sessionIds.length === 0) {
        setError('All evaluations already exist for the selected children.')
        setProcessing(false)
        return
      }

      // Store remaining session IDs in localStorage for after first payment
      if (sessionIds.length > 1) {
        localStorage.setItem('pending_checkout_sessions', JSON.stringify(sessionIds.slice(1)))
      }

      // Redirect to first checkout session
      const result = await stripe.redirectToCheckout({
        sessionId: sessionIds[0],
      })

      if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (error: any) {
      console.error('Error processing multiple purchases:', error)
      setError(error.message || 'Failed to process purchases. Please try again.')
      setProcessing(false)
    }
  }

  /**
   * Handles the request for an evaluation (no payment yet).
   * Creates an evaluation request, waits for scout to confirm/deny.
   * Payment will be charged when scout confirms.
   */
  const handlePurchase = async () => {
    // If parent, show children selection modal
    if (isParent && !player) {
      setShowChildrenModal(true)
      return
    }

    // If player, proceed with normal purchase
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

  /**
   * Handles requesting a free evaluation
   */
  const handleRequestFreeEval = async () => {
    try {
      setProcessing(true)
      setError(null)

      const response = await fetch('/api/evaluation/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scoutId: scout.id,
          price: 0, // Free eval
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.evaluationId) {
          router.push(`/evaluations/${data.evaluationId}`)
          return
        }
        throw new Error(data.error || 'Failed to request free evaluation')
      }

      if (data.evaluationId) {
        router.push(`/evaluations/${data.evaluationId}`)
      } else {
        throw new Error('No evaluation ID returned')
      }
    } catch (error: any) {
      console.error('Error requesting free evaluation:', error)
      setError(error.message || 'Failed to request free evaluation. Please try again.')
      setProcessing(false)
    }
  }

  // Helper function to render an evaluation card
  function renderEvalCard(
    title: string,
    price: number,
    description: string | null,
    onButtonClick: () => void,
    buttonText: string,
    isFree: boolean = false
  ) {
    return (
      <div>
        {/* Offer Title */}
        <h2 className="text-lg font-semibold text-black mb-4">
          {title}
        </h2>
        
        {/* Bio - Show for all users on evaluation offer */}
        {scout.bio && (
          <div className="mb-6">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {scout.bio}
            </p>
          </div>
        )}

        {/* Description for free eval */}
        {isFree && description && (
          <div className="mb-6">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
          <div className="space-y-4">
            {/* Price and Turnaround Time */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-black">Evaluation Service</span>
                <span className="font-bold text-black">
                  ${price.toFixed(2)}
                </span>
              </div>
              {scout.turnaround_time && (
                <p className="text-sm text-gray-600">
                  {scout.turnaround_time.includes('after scout confirmation') || scout.turnaround_time.includes('from scout confirmation')
                    ? scout.turnaround_time.replace('from scout confirmation', 'after scout confirmation')
                    : `${scout.turnaround_time} after scout confirmation`}
                </p>
              )}
            </div>

            {/* Positions */}
            {(() => {
              let positions: string[] = []
              // Try to load from positions JSONB array first (new format)
              if (scout.positions && typeof scout.positions === 'string') {
                try {
                  positions = JSON.parse(scout.positions)
                } catch {
                  // If parsing fails, try as single string
                  positions = [scout.positions]
                }
              } else if (Array.isArray(scout.positions)) {
                positions = scout.positions
              } else if (scout.position) {
                // Fall back to single position field (backward compatibility)
                positions = [scout.position]
              }
              return positions.length > 0 ? (
                <div>
                  <span className="text-sm font-medium text-black block mb-2">Positions: </span>
                  <div className="flex flex-wrap gap-2">
                    {positions.map((pos, idx) => (
                      <span 
                        key={idx}
                        className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                      >
                        {pos}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null
            })()}

            {/* College Connections */}
            {(() => {
              let connections: string[] = []
              if (scout.college_connections) {
                try {
                  if (typeof scout.college_connections === 'string') {
                    const parsed = JSON.parse(scout.college_connections)
                    connections = Array.isArray(parsed) ? parsed : Object.values(parsed)
                  } else if (Array.isArray(scout.college_connections)) {
                    connections = scout.college_connections
                  }
                } catch {
                  // If parsing fails, skip
                }
              }
              
              if (connections.length > 0) {
                const connectionColleges = connections
                  .map(slug => collegeEntries.find(c => c.slug === slug))
                  .filter(Boolean)
                
                return connectionColleges.length > 0 ? (
                  <div>
                    <span className="text-sm font-medium text-black block mb-2">Connections: </span>
                    <div className="flex flex-wrap gap-2">
                      {connectionColleges.map((college) => (
                        <div key={college!.slug} className="flex items-center gap-1.5 px-2 py-1 bg-white rounded border border-gray-200">
                          {college!.logo && (
                            <Image
                              src={college!.logo}
                              alt={college!.name}
                              width={16}
                              height={16}
                              className="object-contain"
                              unoptimized
                            />
                          )}
                          <span className="text-xs text-gray-700">{college!.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              }
              return null
            })()}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {isParent && !player && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              It looks like you're a parent account. Please select which child(ren) you're purchasing evaluations for.
            </p>
          </div>
        )}
        
        {!isSignedIn ? (
          <>
            <button
              onClick={() => {
                if (isFree) {
                  onButtonClick()
                } else {
                  if (onSignUpClick) {
                    onSignUpClick()
                  } else {
                    router.push('/auth/signup')
                  }
                }
              }}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg transition-colors"
              style={{ backgroundColor: '#233dff' }}
            >
              {isFree ? buttonText : `Request + Pay Now - $${price.toFixed(2)}`}
            </button>
            <p className="text-sm text-gray-600 mt-2 text-center mb-0">
              {isFree ? '' : 'Payment is charged immediately and held in escrow. Full refund if scout denies.'}
            </p>
          </>
        ) : (
          <>
            <button
              onClick={onButtonClick}
              disabled={processing}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
            >
              {processing ? 'Processing...' : buttonText}
            </button>
            <p className="text-sm text-gray-600 mt-2 text-center mb-0">
              {isFree ? '' : 'Payment is charged immediately and held in escrow. Full refund if scout denies.'}
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Evaluation Offers - Horizontal scroll on mobile, stacked on desktop */}
      {scout.free_eval_enabled && scout.free_eval_description ? (
        <div className="mb-6">
          {/* Mobile: Horizontal scrollable carousel */}
          <div 
            className="md:hidden overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4" 
            style={{ scrollBehavior: 'smooth' }}
          >
            <div className="flex">
              {/* Free Eval Card - First */}
              <div className="flex-shrink-0 w-screen px-4 snap-start">
                {renderEvalCard(
                  scout.offer_title || 'Free Evaluation',
                  0,
                  scout.free_eval_description,
                  handleRequestFreeEval,
                  'Request Free Evaluation',
                  true
                )}
              </div>
              
              {/* Standard Eval Card - Second */}
              <div className="flex-shrink-0 w-screen px-4 snap-start">
                {renderEvalCard(
                  scout.offer_title || 'Standard Evaluation',
                  scout.price_per_eval || 99,
                  null,
                  handlePurchase,
                  `Request Evaluation - $${scout.price_per_eval || 99}`,
                  false
                )}
              </div>
            </div>
          </div>

          {/* Desktop: Stacked vertically */}
          <div className="hidden md:block space-y-6">
            {/* Free Eval Card - First */}
            {renderEvalCard(
              scout.offer_title || 'Free Evaluation',
              0,
              scout.free_eval_description,
              handleRequestFreeEval,
              'Request Free Evaluation',
              true
            )}
            
            {/* Standard Eval Card - Second */}
            {renderEvalCard(
              scout.offer_title || 'Standard Evaluation',
              scout.price_per_eval || 99,
              null,
              handlePurchase,
              `Request Evaluation - $${scout.price_per_eval || 99}`,
              false
            )}
          </div>
        </div>
      ) : (
        /* Standard Eval Card - when free eval not enabled */
        <div>
        {/* Offer Title */}
        <h2 className="text-lg font-semibold text-black mb-4">
          {scout.offer_title || 'Standard Evaluation'}
        </h2>
        
        {/* Bio - Show for all users on evaluation offer */}
        {scout.bio && (
          <div className="mb-6">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {scout.bio}
            </p>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
          <div className="space-y-4">
            {/* Price and Turnaround Time */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-black">Evaluation Service</span>
                <span className="font-bold text-black">
                  ${scout.price_per_eval ? scout.price_per_eval.toFixed(2) : '99.00'}
                </span>
              </div>
              {scout.turnaround_time && (
                <p className="text-sm text-gray-600">
                  {scout.turnaround_time.includes('after scout confirmation') || scout.turnaround_time.includes('from scout confirmation')
                    ? scout.turnaround_time.replace('from scout confirmation', 'after scout confirmation')
                    : `${scout.turnaround_time} after scout confirmation`}
                </p>
              )}
            </div>

            {/* Positions */}
            {(() => {
              let positions: string[] = []
              // Try to load from positions JSONB array first (new format)
              if (scout.positions && typeof scout.positions === 'string') {
                try {
                  positions = JSON.parse(scout.positions)
                } catch {
                  // If parsing fails, try as single string
                  positions = [scout.positions]
                }
              } else if (Array.isArray(scout.positions)) {
                positions = scout.positions
              } else if (scout.position) {
                // Fall back to single position field (backward compatibility)
                positions = [scout.position]
              }
              return positions.length > 0 ? (
                <div>
                  <span className="text-sm font-medium text-black block mb-2">Positions: </span>
                  <div className="flex flex-wrap gap-2">
                    {positions.map((pos, idx) => (
                      <span 
                        key={idx}
                        className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                      >
                        {pos}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null
            })()}

            {/* College Connections */}
            {(() => {
              let connections: string[] = []
              if (scout.college_connections) {
                try {
                  if (typeof scout.college_connections === 'string') {
                    const parsed = JSON.parse(scout.college_connections)
                    connections = Array.isArray(parsed) ? parsed : Object.values(parsed)
                  } else if (Array.isArray(scout.college_connections)) {
                    connections = scout.college_connections
                  }
                } catch {
                  // If parsing fails, skip
                }
              }
              
              if (connections.length > 0) {
                const connectionColleges = connections
                  .map(slug => collegeEntries.find(c => c.slug === slug))
                  .filter(Boolean)
                
                return connectionColleges.length > 0 ? (
                  <div>
                    <span className="text-sm font-medium text-black block mb-2">Connections: </span>
                    <div className="flex flex-wrap gap-2">
                      {connectionColleges.map((college) => (
                        <div key={college!.slug} className="flex items-center gap-1.5 px-2 py-1 bg-white rounded border border-gray-200">
                          {college!.logo && (
                            <Image
                              src={college!.logo}
                              alt={college!.name}
                              width={16}
                              height={16}
                              className="object-contain"
                              unoptimized
                            />
                          )}
                          <span className="text-xs text-gray-700">{college!.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              }
              return null
            })()}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {isParent && !player && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              It looks like you're a parent account. Please select which child(ren) you're purchasing evaluations for.
            </p>
          </div>
        )}
        
        {!isSignedIn ? (
          <>
            <button
              onClick={() => {
                if (onSignUpClick) {
                  onSignUpClick()
                } else {
                  router.push('/auth/signup')
                }
              }}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg transition-colors"
              style={{ backgroundColor: '#233dff' }}
            >
              Request + Pay Now - ${scout.price_per_eval ? scout.price_per_eval.toFixed(2) : '99.00'}
            </button>
            <p className="text-sm text-gray-600 mt-2 text-center mb-0">
              Payment is charged immediately and held in escrow. Full refund if scout denies.
            </p>
          </>
        ) : (
          <>
            <button
              onClick={handlePurchase}
              disabled={processing}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
            >
              {processing ? 'Processing...' : `Request Evaluation - $${scout.price_per_eval || 99}`}
            </button>
            <p className="text-sm text-gray-600 mt-2 text-center mb-0">
              Payment is charged immediately and held in escrow. Full refund if scout denies.
            </p>
          </>
        )}
          </div>
        </div>
      ) : (
        /* Standard Eval Card - when free eval not enabled */
        renderEvalCard(
          scout.offer_title || 'Standard Evaluation',
          scout.price_per_eval || 99,
          null,
          handlePurchase,
          `Request Evaluation - $${scout.price_per_eval || 99}`,
          false
        )
      )}

      {/* Children Selection Modal for Parents */}
      {isParent && parentId && (
        <SelectChildrenModal
          isOpen={showChildrenModal}
          onClose={() => setShowChildrenModal(false)}
          onConfirm={handleMultiplePurchases}
          parentId={parentId}
        />
      )}
    </div>
  )
}

