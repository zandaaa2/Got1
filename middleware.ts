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
      const allCookies = request.cookies.getAll()
      const supabaseCookies = allCookies.filter(c => c.name.startsWith('sb-'))

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

      // Try to get session (always attempt, even if no cookies, to handle edge cases)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession().catch((err) => {
        return { data: { session: null }, error: err }
      })

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
        // Verify the session is valid by getting the user
        const { data: { user }, error: userError } = await supabase.auth.getUser().catch((err) => {
          return { data: { user: null }, error: err }
        })

        // If getUser fails, refresh the session
        if (userError || !user) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession(session).catch((err) => {
            return { data: { session: null }, error: err }
          })

          if (refreshData?.session && process.env.NODE_ENV === 'development') {
            console.log('Middleware: Session refreshed (getUser failed), user ID:', refreshData.session.user.id)
          } else if (refreshError && process.env.NODE_ENV === 'development') {
            console.log('Middleware: Session refresh error:', refreshError.message)
          }
        } else if (process.env.NODE_ENV === 'development') {
          console.log('Middleware: Session valid, user ID:', user.id)
        }

        // For authenticated users on protected routes, check profile completion
        if (!isPublicRoute && user) {
          // Profile setup routes should be allowed without completion check
          const profileSetupRoutes = [
            '/profile/user-setup',
            '/profile/parent-setup',
            '/profile/parent/create-player',
          ]
          const isProfileSetupRoute = profileSetupRoutes.some(route => pathname.startsWith(route))

          if (!isProfileSetupRoute) {
            // Check if profile has required fields
            let { data: profile } = await supabase
              .from('profiles')
              .select('full_name, username, birthday, role')
              .eq('user_id', user.id)
              .maybeSingle()

            // CRITICAL FIX: If profile exists with role='player', fix it immediately
            if (profile && profile.role === 'player') {
              console.log('⚠️ Middleware - Found profile with role=player, fixing to user')
              await supabase
                .from('profiles')
                .update({ role: 'user' })
                .eq('user_id', user.id)
              // Re-fetch profile after fix
              const { data: fixedProfile } = await supabase
                .from('profiles')
                .select('full_name, username, birthday, role')
                .eq('user_id', user.id)
                .maybeSingle()
              profile = fixedProfile
            }

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
