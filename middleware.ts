import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js middleware that handles Supabase session management.
 * Refreshes user sessions and ensures authentication cookies are properly set.
 * Only runs on non-API routes to avoid interfering with API request handling.
 *
 * @param {NextRequest} request - The incoming request
 * @returns {Promise<NextResponse>} Response with updated cookies if session is refreshed
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // Only run on non-API routes
    if (!request.nextUrl.pathname.startsWith('/api')) {
      // Debug: Check what cookies we have
      const allCookies = request.cookies.getAll()
      const supabaseCookies = allCookies.filter(c => c.name.startsWith('sb-'))
      if (process.env.NODE_ENV === 'development' && supabaseCookies.length > 0) {
        console.log('Middleware: Found Supabase cookies:', supabaseCookies.map(c => c.name))
        // Check if we have the required session cookies
        const hasToken0 = supabaseCookies.some(c => c.name.includes('auth-token.0'))
        const hasToken1 = supabaseCookies.some(c => c.name.includes('auth-token.1'))
        console.log('Middleware: Has token.0:', hasToken0, 'Has token.1:', hasToken1)
      }

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

      // Try getSession first (more reliable than getUser)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession().catch((err) => {
        return { data: { session: null }, error: err }
      })
      
      if (session) {
        console.log('Middleware: Session found via getSession, user ID:', session.user.id)
        // Refresh session if expired - this keeps the session alive
        const { data: { user }, error: userError } = await supabase.auth.getUser().catch((err) => {
          return { data: { user: null }, error: err }
        })
        
        if (process.env.NODE_ENV === 'development') {
          if (userError) {
            console.log('Middleware: getUser error:', userError.message)
          }
          if (user) {
            console.log('Middleware: User authenticated:', user.id)
          } else {
            console.log('Middleware: No user found (but session exists)')
          }
        }
      } else {
        // No session found - try getUser as fallback
        const { data: { user }, error: userError } = await supabase.auth.getUser().catch((err) => {
          return { data: { user: null }, error: err }
        })
        
        // Log for debugging (only in development)
        if (process.env.NODE_ENV === 'development') {
          if (sessionError) {
            console.log('Middleware: getSession error:', sessionError.message)
          }
          if (userError) {
            console.log('Middleware: getUser error:', userError.message)
          }
          if (user) {
            console.log('Middleware: User authenticated:', user.id)
          } else {
            console.log('Middleware: No user found')
          }
        }
      }
    }
  } catch (error) {
    // If middleware fails, just continue without session refresh
    console.error('Middleware error:', error)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

