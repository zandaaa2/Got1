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
    
    console.log('Back button clicked, navigating to:', fallbackUrl) // Debug log
    
    // Use window.location.href for guaranteed navigation
    if (typeof window !== 'undefined' && fallbackUrl) {
      window.location.href = fallbackUrl
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
      {showArrow && <span className="md:hidden">Back</span>}
    </button>
  )
}
