'use client'

const CALENDLY_30_MIN_URL = 'https://calendly.com/zander-got1/30min'
const CALENDLY_15_MIN_URL = 'https://calendly.com/zander-got1/30min'

/**
 * Opens the Calendly 30-minute meeting popup with the founder.
 * Falls back to a new tab if the Calendly widget script is not ready.
 */
export function openCalendly30Min() {
  if (typeof window === 'undefined') return

  const calendly = (window as any).Calendly

  if (calendly && typeof calendly.initPopupWidget === 'function') {
    calendly.initPopupWidget({ url: CALENDLY_30_MIN_URL })
  } else {
    // Fallback: just open Calendly in a new tab
    window.open(CALENDLY_30_MIN_URL, '_blank', 'noopener,noreferrer')
  }
}

/**
 * Opens the Calendly 15-minute meeting popup with the founder.
 * Falls back to a new tab if the Calendly widget script is not ready.
 */
export function openCalendly15Min() {
  if (typeof window === 'undefined') return

  const calendly = (window as any).Calendly

  if (calendly && typeof calendly.initPopupWidget === 'function') {
    calendly.initPopupWidget({ url: CALENDLY_15_MIN_URL })
  } else {
    // Fallback: just open Calendly in a new tab
    window.open(CALENDLY_15_MIN_URL, '_blank', 'noopener,noreferrer')
  }
}


