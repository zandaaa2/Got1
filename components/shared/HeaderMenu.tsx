'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

interface HeaderMenuProps {
  userId?: string
  scoutId?: string
  evaluationId?: string  // If provided, use this specific evaluation ID instead of searching
  onCancelled?: () => void  // Callback to trigger reload after cancellation
}

/**
 * Three-dot menu component.
 * Shows "Cancel evaluation request" option if there's a pending evaluation with the specified scout.
 */
export default function HeaderMenu({ userId, scoutId, evaluationId, onCancelled }: HeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [pendingEvaluationId, setPendingEvaluationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const menuId = useId()

  // Check for pending evaluations
  useEffect(() => {
    const checkPendingEvaluation = async () => {
      // If evaluationId is provided directly, use it (trust the caller knows status is 'requested')
      if (evaluationId) {
        try {
          const { data: evaluation } = await supabase
            .from('evaluations')
            .select('id, status')
            .eq('id', evaluationId)
            .maybeSingle()

          if (evaluation?.status === 'requested') {
            console.log('✅ Evaluation eligible for cancellation:', evaluation.id)
            setPendingEvaluationId(evaluation.id)
          } else {
            console.log('ℹ️ Evaluation not cancellable (status:', evaluation?.status, ')')
            setPendingEvaluationId(null)
          }
        } catch (error) {
          console.error('Error checking evaluation status:', error)
          setPendingEvaluationId(null)
        } finally {
          setLoading(false)
        }
        return
      }

      if (!userId) {
        setLoading(false)
        return
      }

      try {
        // Get user's profile to check if they're a player
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()

        // Only check for players
        if (profile?.role !== 'player') {
          setLoading(false)
          return
        }

        // Build query - only show cancel option for 'requested' status (before scout confirms)
        let query = supabase
          .from('evaluations')
          .select('id, status')
          .eq('player_id', userId)
          .eq('status', 'requested') // Only allow cancellation before scout confirms

        // If scoutId is provided, only check for evaluation with that scout
        if (scoutId) {
          query = query.eq('scout_id', scoutId)
        }

        const { data: evaluation } = await query
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (evaluation) {
          setPendingEvaluationId(evaluation.id)
        }
      } catch (error) {
        console.error('Error checking pending evaluation:', error)
      } finally {
        setLoading(false)
      }
    }

    checkPendingEvaluation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, scoutId, evaluationId])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus()
    }
  }, [isOpen])

  const handleCancelEvaluation = async () => {
    if (!pendingEvaluationId) return

    if (!confirm('Are you sure you want to cancel this evaluation request? This action cannot be undone.')) {
      return
    }

    try {
      setIsCancelling(true)
      const response = await fetch('/api/evaluation/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ evaluationId: pendingEvaluationId }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Cancel API error:', result)
        alert(result.error || 'Failed to cancel evaluation. Please try again.')
        return
      }

      console.log('✅ Evaluation cancelled via API:', pendingEvaluationId, result)

      setIsOpen(false)
      setPendingEvaluationId(null)
      
      // Trigger reload callback if provided
      if (onCancelled) {
        console.log('🔄 Calling onCancelled callback')
        onCancelled()
      } else {
        // Fallback to router refresh and navigation
        router.refresh()
        router.push('/my-evals')
      }
    } catch (error: any) {
      console.error('Error cancelling evaluation:', error)
      alert('Failed to cancel evaluation. Please try again.')
    } finally {
      setIsCancelling(false)
    }
  }

  // Debug logging
  console.log('HeaderMenu render check:', { 
    loading, 
    pendingEvaluationId, 
    evaluationId, 
    userId, 
    scoutId 
  })
  
  // Only show menu if there's a pending evaluation
  if (loading) {
    return null // Still loading
  }
  
  if (!pendingEvaluationId) {
    // If evaluationId was provided but not set, something went wrong
    if (evaluationId) {
      console.error('⚠️ evaluationId provided but pendingEvaluationId not set:', { 
        evaluationId, 
        userId,
        scoutId 
      })
    }
    return null // No pending evaluation found
  }

  console.log('✅ Rendering HeaderMenu with evaluationId:', pendingEvaluationId)

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          console.log('🔘 Menu button clicked')
          setIsOpen(!isOpen)
        }}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
      >
        <svg
          className="w-5 h-5 text-black"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuPanelRef}
          id={menuId}
          role="menu"
          aria-label="Evaluation actions"
          className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
          style={{ zIndex: 9999 }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCancelEvaluation()
            }}
            disabled={isCancelling}
            ref={cancelButtonRef}
            role="menuitem"
            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {isCancelling ? 'Cancelling...' : 'Cancel evaluation request'}
          </button>
        </div>
      )}
    </div>
  )
}

