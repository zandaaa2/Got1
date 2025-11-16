'use client'

import { useState } from 'react'
import { openCalendly30Min } from '@/lib/calendly'

/**
 * Small header button, placed to the left of Feature Request,
 * that opens a 30-minute Calendly call with the founder.
 */
export default function HelpMeetingButton() {
  const [opening, setOpening] = useState(false)

  const handleClick = () => {
    if (opening) return
    setOpening(true)
    try {
      openCalendly30Min()
    } finally {
      // Give Calendly a moment to open; then allow another click
      setTimeout(() => setOpening(false), 1000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={opening}
      className="hidden md:inline-flex items-center justify-center h-10 px-4 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {opening ? 'Opening…' : '15-min help'}
    </button>
  )
}


