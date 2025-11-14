import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API route to ensure session cookies are set server-side after client-side auth.
 * This is called after exchangeCodeForSession to ensure cookies are available to server components.
 * Uses the same cookie handling pattern as middleware for consistency.
 */
export async function POST(request: NextRequest) {
  try {
    // Create response with proper cookie handling
    let response = NextResponse.next()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              // Ensure cookies are set with proper options for Next.js
              response.cookies.set(name, value, {
                ...options,
                sameSite: 'lax',
                path: '/',
                httpOnly: options?.httpOnly ?? false,
                secure: process.env.NODE_ENV === 'production',
              })
            })
          },
        },
      }
    )
    
    // Get the session from the request (cookies should already be set by createBrowserClient)
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      return NextResponse.json({ error: 'Failed to get session' }, { status: 401 })
    }
    
    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }
    
    // Refresh the session to ensure cookies are properly set server-side
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession(session)
    
    if (refreshError) {
      console.error('Error refreshing session:', refreshError)
      return NextResponse.json({ error: 'Failed to refresh session' }, { status: 500 })
    }
    
    // Create JSON response with updated cookies
    const jsonResponse = NextResponse.json({ 
      success: true, 
      user: refreshData.session?.user 
    })
    
    // Copy all cookies from the supabase client response to the JSON response
    // This ensures cookies set by refreshSession are included in the response
    response.cookies.getAll().forEach(cookie => {
      jsonResponse.cookies.set(cookie.name, cookie.value, {
        sameSite: 'lax',
        path: '/',
        httpOnly: cookie.name.includes('auth-token') ? true : false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: cookie.name.includes('auth-token') ? 60 * 60 * 24 * 365 : undefined, // 1 year for auth tokens
      })
    })
    
    // Also ensure we copy any cookies that might have been set during refreshSession
    // The supabase client should have set cookies during getSession and refreshSession
    const allCookies = request.cookies.getAll()
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('sb-')) {
        jsonResponse.cookies.set(cookie.name, cookie.value, {
          sameSite: 'lax',
          path: '/',
          httpOnly: cookie.name.includes('auth-token') ? true : false,
          secure: process.env.NODE_ENV === 'production',
        })
      }
    })
    
    return jsonResponse
  } catch (error: any) {
    console.error('Set session error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

