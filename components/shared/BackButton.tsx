'use client'

import { useRouter } from 'next/navigation'

interface BackButtonProps {
  fallbackUrl?: string
  className?: string
  showArrow?: boolean
}

export default function BackButton({ fallbackUrl = '/browse', className = '', showArrow = true }: BackButtonProps) {
  const router = useRouter()

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Use browser history to go back
    if (typeof window !== 'undefined') {
      // Check if we can go back (there's history)
      if (window.history.length > 1) {
        router.back()
      } else if (fallbackUrl) {
        // Fallback to provided URL if no history
        router.push(fallbackUrl)
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`flex items-center gap-2 text-black hover:opacity-70 text-sm md:text-base relative z-50 cursor-pointer ${className}`}
      style={{ 
        pointerEvents: 'auto', 
        position: 'relative',
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0
      }}
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
      <span>Back</span>
    </button>
  )
}
