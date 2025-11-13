'use client'

import { useState } from 'react'

interface ShareButtonProps {
  evaluationId: string
  evaluation: {
    id: string
    share_token: string | null
    status: string
    scout?: {
      full_name: string | null
      organization: string | null
    } | null
  }
}

export default function ShareButton({ evaluationId, evaluation }: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  // Share button available for ALL evaluations (not just completed)
  // For completed evaluations, use share_token for public link
  // For other statuses, share the regular evaluation link (requires auth)
  
  const shareToken = evaluation.share_token
  // If evaluation is completed and has share_token, use public share URL
  // Otherwise, use the regular evaluation URL (requires login)
  const shareUrl = (evaluation.status === 'completed' && shareToken)
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/evaluations/${evaluationId}/share/${shareToken}`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/evaluations/${evaluationId}`

  const handleShareTwitter = async () => {
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
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`
    window.open(twitterUrl, '_blank', 'width=550,height=420')
    
    setShowMenu(false)
  }

  const handleCopyLink = async () => {
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
      alert('Failed to copy link. Please try again.')
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
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="py-1">
              <button
                onClick={handleShareTwitter}
                className="w-full text-left px-4 py-2 text-sm text-black hover:bg-gray-100 flex items-center gap-2 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full text-left px-4 py-2 text-sm text-black hover:bg-gray-100 flex items-center gap-2 transition-colors"
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

