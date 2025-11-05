'use client'

import { createBrowserClient } from '@supabase/ssr'

// Client component Supabase client (for use in client components)
// createBrowserClient automatically handles cookie storage for SSR compatibility
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

