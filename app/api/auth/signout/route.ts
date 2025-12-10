import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'

/**
 * Sign out API route
 * Clears the user session and redirects to sign-in page
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(() => cookies())
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Sign out error:', error)
      // Still redirect even if there's an error
    }
    
    // Create redirect response to /welcome
    const redirectUrl = new URL('/welcome', request.url)
    const response = NextResponse.redirect(redirectUrl)
    
    // Manually clear all Supabase cookies
    const allCookies = cookies().getAll()
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('sb-')) {
        // Clear cookie by setting it to expire in the past
        response.cookies.set(cookie.name, '', {
          expires: new Date(0),
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        })
      }
    })
    
    return response
  } catch (error: any) {
    console.error('Sign out error:', error)
    // Even on error, redirect to welcome
    return NextResponse.redirect(new URL('/welcome', request.url))
  }
}

/**
 * GET handler for sign-out (redirects to POST)
 */
export async function GET(request: NextRequest) {
  return POST(request)
}

