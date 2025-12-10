'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AccountCreatedAnimationProps {
  onComplete: () => void
}

export default function AccountCreatedAnimation({ onComplete }: AccountCreatedAnimationProps) {
  const [showAnimation, setShowAnimation] = useState(true)

  useEffect(() => {
    // Show animation for 2.5 seconds then call onComplete
    const timer = setTimeout(() => {
      setShowAnimation(false)
      onComplete()
    }, 2500)

    return () => clearTimeout(timer)
  }, [onComplete])

  if (!showAnimation) return null

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="text-center space-y-6 animate-fade-in">
        {/* Success Checkmark Animation */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-full bg-green-100 animate-scale-in"></div>
          <svg
            className="w-24 h-24 text-green-600 relative z-10 animate-check-draw"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
              className="animate-draw-path"
            />
          </svg>
        </div>

        {/* Success Message */}
        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold text-black">
            Account Created!
          </h2>
          <p className="text-lg text-gray-600">
            Redirecting to your profile...
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }

        @keyframes check-draw {
          from {
            stroke-dashoffset: 100;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes draw-path {
          0% {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dasharray: 100;
            stroke-dashoffset: 0;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-in;
        }

        .animate-scale-in {
          animation: scale-in 0.6s ease-out;
        }

        .animate-check-draw {
          animation: check-draw 0.8s ease-out;
        }

        .animate-draw-path {
          stroke-dasharray: 100;
          animation: draw-path 0.8s ease-out;
        }
      `}</style>
    </div>
  )
}


