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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Return success - client will handle redirect
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Sign out error:', error)
    return NextResponse.json({ error: error.message || 'Failed to sign out' }, { status: 500 })
  }
}

/**
 * GET handler for sign-out (redirects to POST)
 */
export async function GET(request: NextRequest) {
  return POST(request)
}

