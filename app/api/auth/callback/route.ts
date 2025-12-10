import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Handles authentication callbacks from OAuth providers and email magic links.
 * For OAuth (code parameter), redirects to client-side callback where PKCE verifier is accessible.
 * For email magic links (token_hash), handles server-side verification.
 *
 * @param {NextRequest} request - The incoming request with authentication parameters
 * @returns {Promise<NextResponse>} Redirect response to appropriate page
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  
  console.log('🔵 API /api/auth/callback hit')
  console.log('🔵 Full URL:', requestUrl.href)
  console.log('🔵 Code:', code ? code.substring(0, 20) + '...' : 'MISSING')
  console.log('🔵 Token hash:', token_hash ? 'PRESENT' : 'MISSING')
  console.log('🔵 All params:', Object.fromEntries(requestUrl.searchParams))
  
  // For OAuth (code), redirect to client-side callback where PKCE verifier in localStorage is accessible
  if (code) {
    console.log('🔵 OAuth code detected, redirecting to /auth/callback')
    // Redirect to client-side callback page which has access to localStorage for PKCE
    const redirectUrl = new URL('/auth/callback', requestUrl.origin)
    requestUrl.searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value)
    })
    console.log('🔵 Redirect URL:', redirectUrl.href)
    return NextResponse.redirect(redirectUrl)
  }
  
  // For email confirmation links (token_hash), redirect to client-side callback
  // This ensures cookies are properly set and the session is accessible client-side
  if (token_hash) {
    const redirectUrl = new URL('/auth/callback', requestUrl.origin)
    requestUrl.searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value)
    })
    return NextResponse.redirect(redirectUrl)
  }

  // Fallback redirect
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}

