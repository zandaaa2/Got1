import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server component Supabase client (for use in server components)
export const createServerClient = () => {
  const cookieStore = cookies()

  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Route handler Supabase client (for API routes)
export const createRouteHandlerClient = (getCookies: () => any) => {
  const getCookieStore = getCookies

  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Get fresh cookies each time (not cached)
          const cookieStore = getCookieStore()
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            const cookieStore = getCookieStore()
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            // Handle error
            console.error('Error setting cookies in route handler:', error)
          }
        },
      },
    }
  )
}

