'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface BackButtonProps {
  fallbackUrl?: string
  className?: string
  showArrow?: boolean
}

export default function BackButton({ fallbackUrl = '/browse', className = '', showArrow = true }: BackButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    // Check if we can go back by checking browser history
    // Note: window.history.length > 1 indicates there's history, but it's not always reliable
    // We'll try a more reliable approach by attempting navigation
    if (typeof window !== 'undefined') {
      // If there's history (length > 1), we can try to go back
      // But we'll still provide a fallback
      setCanGoBack(window.history.length > 1)
    }
  }, [])

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    
    console.log('Back button clicked') // Debug log
    
    if (typeof window === 'undefined') {
      router.push(fallbackUrl)
      return
    }

    // Always try to go back first
    if (window.history.length > 1) {
      window.history.back()
    } else {
      // No history available, go directly to fallback
      router.push(fallbackUrl)
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`flex items-center gap-2 text-black hover:opacity-70 text-sm md:text-base relative z-30 cursor-pointer ${className}`}
      style={{ pointerEvents: 'auto', position: 'relative' }}
      aria-label="Go back"
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
          d="M15 19l-7-7 7-7"
        />
      </svg>
      {showArrow && <span className="md:hidden">Back</span>}
    </button>
  )
}
