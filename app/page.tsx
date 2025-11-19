import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is signed in, redirect to browse page
  // Otherwise, redirect to "What's this" page as the default landing page
  if (session) {
    redirect('/browse')
  }
  
  redirect('/whats-this')
}

