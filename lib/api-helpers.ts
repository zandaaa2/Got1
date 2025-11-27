import { createRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAdmin } from '@/lib/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client for API route handlers
 */
export function getApiSupabaseClient(): SupabaseClient {
  return createRouteHandlerClient(() => cookies())
}

/**
 * Requires authentication for an API route.
 * Returns the session and supabase client if authenticated, or an error response if not.
 */
export async function requireAuth(request?: NextRequest): Promise<
  | { session: any; supabase: SupabaseClient; response?: never }
  | { session?: never; supabase?: never; response: NextResponse }
> {
  const supabase = getApiSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { session, supabase }
}

/**
 * Requires admin access for an API route.
 * Returns the session and supabase client if admin, or an error response if not.
 */
export async function requireAdmin(request?: NextRequest): Promise<
  | { session: any; supabase: SupabaseClient; response?: never }
  | { session?: never; supabase?: never; response: NextResponse }
> {
  // First check authentication
  const authResult = await requireAuth(request)
  if (authResult.response) {
    return authResult // Return 401 if not authenticated
  }

  const { session, supabase } = authResult

  // Check admin access
  const userIsAdmin = await isAdmin(session.user.id)
  if (!userIsAdmin) {
    return {
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { session, supabase }
}

/**
 * Standardized error handler for API routes
 */
export function handleApiError(error: any, defaultMessage: string = 'An error occurred'): NextResponse {
  console.error('API Error:', error)

  // Handle known error types
  if (error?.message) {
    return NextResponse.json(
      { error: error.message, details: error.details || null },
      { status: error.status || 500 }
    )
  }

  // Handle Supabase errors
  if (error?.code) {
    return NextResponse.json(
      { error: error.message || defaultMessage, details: error.code },
      { status: 500 }
    )
  }

  // Fallback to default error
  return NextResponse.json(
    { error: defaultMessage },
    { status: 500 }
  )
}

/**
 * Standardized success response
 */
export function successResponse(data: any, status: number = 200): NextResponse {
  return NextResponse.json(data, { status })
}

