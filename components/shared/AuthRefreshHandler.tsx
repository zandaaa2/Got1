'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Client component that handles auth refresh after sign-in/sign-up.
 * Forces a router refresh on mount to ensure server components re-fetch
 * the session and profile data after authentication.
 */
export default function AuthRefreshHandler() {
  const router = useRouter()

  useEffect(() => {
    // Force a router refresh to re-fetch server components
    // This ensures the session is read from cookies on the server
    router.refresh()
  }, [router])

  return null
}

