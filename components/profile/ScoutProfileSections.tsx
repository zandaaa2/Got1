'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

interface ScoutProfileSectionsProps {
  scoutName: string
  isSignedIn?: boolean
}

export default function ScoutProfileSections({ scoutName, isSignedIn = false }: ScoutProfileSectionsProps) {
  const [dismissedSections, setDismissedSections] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Only check localStorage for authenticated users
    if (!isSignedIn) {
      return
    }

    const loadDismissedSections = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user?.id) {
        setUserId(session.user.id)
        const storageKey = `dismissed-scout-sections-${session.user.id}`
        const dismissed = localStorage.getItem(storageKey)
        if (dismissed) {
          try {
            const dismissedArray = JSON.parse(dismissed)
            setDismissedSections(new Set(dismissedArray))
          } catch {
            // If parsing fails, start fresh
            setDismissedSections(new Set())
          }
        }
      }
    }

    loadDismissedSections()
  }, [isSignedIn])

  const handleDismiss = (sectionKey: string) => {
    if (!userId) return

    const newDismissed = new Set(dismissedSections)
    newDismissed.add(sectionKey)
    setDismissedSections(newDismissed)

    // Save to localStorage
    const storageKey = `dismissed-scout-sections-${userId}`
    localStorage.setItem(storageKey, JSON.stringify(Array.from(newDismissed)))
  }

  // For unauthenticated users, always show all sections (no dismiss functionality)
  // For authenticated users, only show sections that haven't been dismissed
  const shouldShowSection = (sectionKey: string) => {
    if (!isSignedIn) {
      return true // Always show for unauthenticated users
    }
    return !dismissedSections.has(sectionKey) // Show if not dismissed for authenticated users
  }

  const visibleSections = [
    shouldShowSection('why-valuable'),
    shouldShowSection('what-to-expect'),
    shouldShowSection('faq')
  ].filter(Boolean).length

  // Don't render container if all sections are dismissed (only applies to authenticated users)
  if (isSignedIn && visibleSections === 0) {
    return null
  }

  // Dynamic grid columns based on visible sections
  const gridCols = visibleSections === 1 ? 'md:grid-cols-1' : visibleSections === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'

  return (
    <div className={`grid grid-cols-1 ${gridCols} gap-6 md:gap-8 mt-12`}>
      {/* Why it's valuable */}
      {shouldShowSection('why-valuable') && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 relative">
          {isSignedIn && (
            <button
              onClick={() => handleDismiss('why-valuable')}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss section"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          )}
          <h3 className={`text-lg font-bold text-black mb-4 ${isSignedIn ? 'pr-8' : ''}`}>Why it's valuable</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-start gap-2 mb-2">
              <div className="flex items-center gap-1 mt-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 text-yellow-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Get professional evaluations from verified college scouts who understand what coaches are looking for.
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Detailed feedback helps identify strengths and areas for improvement, giving you actionable insights to elevate your game.
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Connect with scouts who have direct connections to college programs and can help advance your recruiting journey.
            </p>
          </div>
        </div>
        </div>
      )}

      {/* What to expect */}
      {shouldShowSection('what-to-expect') && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 relative">
          {isSignedIn && (
            <button
              onClick={() => handleDismiss('what-to-expect')}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss section"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          )}
          <h3 className={`text-lg font-bold text-black mb-4 ${isSignedIn ? 'pr-8' : ''}`}>What to expect</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-xs">1</span>
              </div>
              <h4 className="font-semibold text-black text-sm">Request Evaluation</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed ml-9">
              Choose a scout and submit your game film links. Payment is processed upfront.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-xs">2</span>
              </div>
              <h4 className="font-semibold text-black text-sm">Scout Reviews</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed ml-9">
              The scout watches your film and provides detailed written feedback within their specified turnaround time.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-xs">3</span>
              </div>
              <h4 className="font-semibold text-black text-sm">Receive Feedback</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed ml-9">
              Get your comprehensive evaluation delivered directly to your account. Share it with coaches or use it to improve.
            </p>
          </div>
        </div>
        </div>
      )}

      {/* FAQ */}
      {shouldShowSection('faq') && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 relative">
          {isSignedIn && (
            <button
              onClick={() => handleDismiss('faq')}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss section"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          )}
          <h3 className={`text-lg font-bold text-black mb-4 ${isSignedIn ? 'pr-8' : ''}`}>FAQ</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-black text-sm mb-1">
              How long does an evaluation take?
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Turnaround times vary by scout, typically ranging from 24-72 hours. Check each scout's profile for their specific timeline.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-black text-sm mb-1">
              What format will I receive?
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              You'll receive a detailed written evaluation that breaks down your performance, strengths, and areas for improvement.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-black text-sm mb-1">
              Can I share my evaluation?
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Yes! You can share your evaluations with coaches, trainers, or anyone else you choose via a shareable link.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-black text-sm mb-1">
              What if I'm not satisfied?
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Contact our support team if you have concerns about your evaluation. We're here to help ensure you have a positive experience.
            </p>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}


