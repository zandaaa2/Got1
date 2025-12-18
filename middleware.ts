import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js middleware that handles Supabase session management.
 * Refreshes user sessions and ensures authentication cookies are properly set.
 * Only runs on non-API routes to avoid interfering with API request handling.
 * 
 * Authentication Rules:
 * - Public routes (no auth required):
 *   - /welcome (landing page)
 *   - /[username] (user profile pages - scouts/players/parents/schools)
 *   - /teams/[slug] (school/team pages)
 *   - /faq, /about, /blog, /terms-of-service, /privacy-policy (standalone pages)
 *   - /auth/* (auth routes)
 * - Protected routes (auth required): All other routes
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

  const pathname = request.nextUrl.pathname

  // Define public routes that don't require authentication
  const publicRoutePrefixes = [
    '/welcome',
    '/auth',
    '/faq',
    '/about',
    '/blog',
    '/terms-of-service',
    '/privacy-policy',
    '/teams',
    '/scout', // Scout onboarding flow - steps 1-2 don't require auth
    '/playerparent', // Player/parent onboarding flow - steps 1-2 don't require auth
  ]

  // Check if pathname matches a username route (e.g., /john-doe)
  // Username routes are public (scout/player/parent profile pages)
  // They match: /username (single segment, no dots, not a reserved route)
  const reservedRoutes = ['profile', 'profiles', 'browse', 'discover', 'my-evals', 'notifications', 'admin', 'evaluations']
  const isUsernameRoute = pathname.match(/^\/[^\/]+$/) && 
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !pathname.includes('.') &&
    !reservedRoutes.some(route => pathname.startsWith(`/${route}`)) &&
    !publicRoutePrefixes.some(route => pathname.startsWith(route))

  // Check if pathname is a public route
  const isPublicRoute = publicRoutePrefixes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  ) || isUsernameRoute

  try {
    // Only run on non-API routes
    if (!request.nextUrl.pathname.startsWith('/api')) {
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

      // Add timeout wrapper for session operations
      const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
          )
        ])
      }

      // Try to get session with timeout (5 seconds max)
      let session = null
      try {
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          5000
        ).catch((err) => {
          return { data: { session: null }, error: err }
        })
        session = sessionResult.data?.session || null
      } catch (error) {
        // If session check times out, treat as no session for public routes
        // For protected routes, we'll redirect to sign-in
        if (!isPublicRoute) {
          console.error('Middleware: Session check timeout, redirecting to sign-in')
          const signInUrl = new URL('/auth/signin', request.url)
          signInUrl.searchParams.set('redirect', pathname)
          return NextResponse.redirect(signInUrl)
        }
      }

      // If route is protected and user is not authenticated, redirect appropriately
      if (!isPublicRoute && !session) {
        // Check if this is an OAuth callback on root (shouldn't happen, but just in case)
        const code = request.nextUrl.searchParams.get('code')
        const token_hash = request.nextUrl.searchParams.get('token_hash')
        if (code || token_hash) {
          console.log('🟡 Middleware: OAuth params detected on protected route without session')
          console.log('🟡 Redirecting to /auth/callback to handle OAuth')
          const callbackUrl = new URL('/auth/callback', request.url)
          request.nextUrl.searchParams.forEach((value, key) => {
            callbackUrl.searchParams.set(key, value)
          })
          return NextResponse.redirect(callbackUrl)
        }
        
        // Special case: root route should go to welcome page, not sign-in
        if (pathname === '/') {
          console.log('🟡 Middleware: No session on root, redirecting to /welcome')
          return NextResponse.redirect(new URL('/welcome', request.url))
        }
        // All other protected routes go to sign-in
        console.log('🟡 Middleware: No session on protected route:', pathname)
        const signInUrl = new URL('/auth/signin', request.url)
        signInUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(signInUrl)
      }

      // If user is authenticated, handle session refresh and profile checks
      if (session) {
        // Skip getUser check for public routes to reduce queries
        // Only verify session for protected routes
        if (!isPublicRoute) {
          // Verify the session is valid by getting the user (with timeout)
          let user = null
          try {
            const userResult = await withTimeout(
              supabase.auth.getUser(),
              3000
            ).catch((err) => {
              return { data: { user: null }, error: err }
            })
            user = userResult.data?.user || null

            // If getUser fails, try to refresh the session (with timeout)
            if (!user && userResult.error) {
              try {
                const refreshResult = await withTimeout(
                  supabase.auth.refreshSession(session),
                  3000
                ).catch((err) => {
                  return { data: { session: null }, error: err }
                })

                if (refreshResult?.data?.session && process.env.NODE_ENV === 'development') {
                  console.log('Middleware: Session refreshed (getUser failed), user ID:', refreshResult.data.session.user.id)
                } else if (refreshResult?.error && process.env.NODE_ENV === 'development') {
                  console.log('Middleware: Session refresh error:', refreshResult.error.message)
                }
                // Use refreshed session user if available
                if (refreshResult?.data?.session?.user) {
                  user = refreshResult.data.session.user
                }
              } catch (refreshError) {
                // If refresh fails, continue without user - let the page handle it
                console.error('Middleware: Session refresh timeout/error')
              }
            } else if (user && process.env.NODE_ENV === 'development') {
              console.log('Middleware: Session valid, user ID:', user.id)
            }
          } catch (error) {
            // If getUser times out, continue without user check
            console.error('Middleware: getUser timeout, continuing without user verification')
          }

          // For authenticated users on protected routes, check profile completion
          if (user) {
            // Profile setup routes should be allowed without completion check
            const profileSetupRoutes = [
              '/profile/user-setup',
              '/profile/parent-setup',
              '/profile/parent/create-player',
            ]
            const isProfileSetupRoute = profileSetupRoutes.some(route => pathname.startsWith(route))

            if (!isProfileSetupRoute) {
              // Check if profile has required fields
              // Note: We don't use timeout here - if this query is slow, we let it continue
              // The page will handle profile validation if needed
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('full_name, username, birthday, role')
                  .eq('user_id', user.id)
                  .maybeSingle()

                const hasRequiredFields = profile && 
                  profile.full_name && 
                  profile.username && 
                  profile.birthday

                if (!hasRequiredFields) {
                  // Don't redirect if user is in onboarding flows (scout or player/parent)
                  // These flows handle profile setup themselves
                  const isOnboardingRoute = pathname.startsWith('/scout') || pathname.startsWith('/playerparent')
                  
                  // If already on onboarding route, don't redirect - let the flow handle it
                  if (isOnboardingRoute) {
                    // Allow the request to continue to the onboarding page
                    return response
                  }
                  
                  // Check for onboarding cookies (set when user clicks "Get Started" or "Become a Scout")
                  const playerparentOnboarding = request.cookies.get('playerparent_onboarding')?.value === 'true'
                  const scoutOnboarding = request.cookies.get('scout_onboarding')?.value === 'true'
                  
                  // If user has playerparent_onboarding cookie and not already on playerparent route, redirect
                  if (playerparentOnboarding && !pathname.startsWith('/playerparent')) {
                    const redirectUrl = new URL('/playerparent?step=2', request.url)
                    return NextResponse.redirect(redirectUrl)
                  }
                  
                  // If user has scout_onboarding cookie and not already on scout route, redirect
                  if (scoutOnboarding && !pathname.startsWith('/scout')) {
                    const redirectUrl = new URL('/scout?step=3', request.url)
                    return NextResponse.redirect(redirectUrl)
                  }
                  
                  // Default: redirect to user-setup if not on onboarding routes and no onboarding cookies
                  if (pathname !== '/profile/user-setup') {
                    const redirectUrl = new URL('/profile/user-setup', request.url)
                    return NextResponse.redirect(redirectUrl)
                  }
                }
              } catch (profileError) {
                // If profile check times out, allow request to continue
                // The page will handle the profile check itself
                console.error('Middleware: Profile check timeout, allowing request to continue')
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // If middleware fails, just continue without session refresh
    console.error('Middleware error:', error)
    // For protected routes, if we can't verify auth, redirect to sign-in
    if (!isPublicRoute) {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(signInUrl)
    }
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
