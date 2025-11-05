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
      onClick={handleShare}
      className="px-2 py-1 text-sm border border-black text-black bg-white rounded hover:bg-gray-50"
    >
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}

