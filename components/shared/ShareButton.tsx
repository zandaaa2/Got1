'use client'

import { useState } from 'react'

interface ShareButtonProps {
  url: string
  title?: string
  text?: string
}

export default function ShareButton({ url, title, text }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url
    const shareText = text || title || 'Check this out on Got1'

    // Try native Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Got1',
          text: shareText,
          url: fullUrl,
        })
        return
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err)
        }
        return
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback: Show URL in alert
      alert(`Share this link: ${fullUrl}`)
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="interactive-press inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 transition-colors"
      aria-label={copied ? 'Link copied to clipboard' : 'Share this page'}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
        <path d="M16 6l-4-4-4 4" />
        <path d="M12 2v13" />
      </svg>
      <span aria-live="polite">{copied ? 'Copied!' : 'Share'}</span>
    </button>
  )
}

