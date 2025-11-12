'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Client component that handles auth refresh after sign-in/sign-up.
 * Checks for a refresh parameter in the URL and forces a router refresh
 * to ensure server components re-fetch the session and profile data.
 */
export default function AuthRefreshHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const refreshParam = searchParams.get('refresh')
    if (refreshParam) {
      // Remove the refresh parameter from URL
      const url = new URL(window.location.href)
      url.searchParams.delete('refresh')
      window.history.replaceState({}, '', url.toString())
      
      // Force router refresh to re-fetch server components
      router.refresh()
    }
  }, [searchParams, router])

  return null
}

