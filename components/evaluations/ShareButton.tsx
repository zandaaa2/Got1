'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

interface ShareButtonProps {
  evaluationId: string
  evaluation: {
    id: string
    share_token: string | null
    status: string
    player_id?: string
    scout?: {
      full_name: string | null
      organization: string | null
    } | null
  }
  userId?: string
}

export default function ShareButton({ evaluationId, evaluation, userId }: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState<string>('')
  const supabase = createClient()

  // Share button available for ALL evaluations (not just completed)
  // For completed evaluations, use share_token for public link
  // For other statuses, share the regular evaluation link (requires auth)
  
  useEffect(() => {
    // Calculate share URL only on client side
    if (typeof window === 'undefined') return
    
    try {
      const shareToken = evaluation?.share_token
      const baseUrl = window.location.origin
      
      const url = (evaluation?.status === 'completed' && shareToken)
        ? `${baseUrl}/evaluations/${evaluationId}/share/${shareToken}`
        : `${baseUrl}/evaluations/${evaluationId}`
      
      setShareUrl(url)
    } catch (error) {
      console.error('Error setting share URL:', error)
      // Fallback URL
      setShareUrl(`/evaluations/${evaluationId}`)
    }
  }, [evaluationId, evaluation?.share_token, evaluation?.status])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showMenu) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showMenu])

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMenu) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      window.addEventListener('keydown', handleEscape)
      return () => {
        window.removeEventListener('keydown', handleEscape)
      }
    }
  }, [showMenu])

  // Don't render until we have the share URL (prevents SSR issues)
  if (!shareUrl) {
    return null
  }

  const handleShareTwitter = async () => {
    if (!shareUrl || typeof window === 'undefined') return
    
    // Track share event (only if authenticated - fails silently if not)
    try {
      const response = await fetch(`/api/evaluations/${evaluationId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: 'twitter',
        }),
      })
      // Don't block if tracking fails (e.g., user not authenticated)
      if (!response.ok && response.status !== 401) {
        console.error('Error tracking share:', response.statusText)
      }
    } catch (error) {
      // Silently fail - sharing should work even if tracking fails
      console.error('Error tracking share:', error)
    }

    // Open Twitter Web Intent - only share the URL, no pre-filled text
    try {
      const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`
      window.open(twitterUrl, '_blank', 'width=550,height=420')
    } catch (error) {
      console.error('Error opening Twitter:', error)
    }
    
    setShowMenu(false)
  }

  const handleCopyLink = async () => {
    if (!shareUrl || typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      
      // Track share event (only if authenticated - fails silently if not)
      try {
        const response = await fetch(`/api/evaluations/${evaluationId}/share`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: 'copy_link',
          }),
        })
        // Don't block if tracking fails (e.g., user not authenticated)
        if (!response.ok && response.status !== 401) {
          console.error('Error tracking share:', response.statusText)
        }
      } catch (error) {
        // Silently fail - sharing should work even if tracking fails
        console.error('Error tracking share:', error)
      }

      setTimeout(() => setCopied(false), 2000)
      setShowMenu(false)
    } catch (error) {
      console.error('Error copying link:', error)
      try {
        alert('Failed to copy link. Please try again.')
      } catch (e) {
        // Ignore if alert fails (e.g., in SSR)
      }
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="interactive-press inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-gray-300 bg-white text-sm font-medium text-black hover:bg-gray-50 transition-colors"
        aria-label="Share evaluation"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
        Share
      </button>

      {showMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowMenu(false)}
        >
          {/* Backdrop - black with transparency */}
          <div className="absolute inset-0 bg-black/50" />
          
          {/* Modal Content - centered */}
          <div
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 md:mx-0 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowMenu(false)}
              className="absolute top-3 right-3 md:top-4 md:right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5 md:w-6 md:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Content */}
            <div className="p-6 md:p-8">
              <h2 className="text-2xl font-bold text-black mb-6">Share Evaluation</h2>
              <div className="space-y-2">
                <button
                  onClick={handleShareTwitter}
                  className="w-full text-left px-4 py-3 text-base text-black hover:bg-gray-100 flex items-center gap-3 transition-colors rounded-lg"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Share on X
                </button>
                <button
                  onClick={handleCopyLink}
                  className="w-full text-left px-4 py-3 text-base text-black hover:bg-gray-100 flex items-center gap-3 transition-colors rounded-lg"
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
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

