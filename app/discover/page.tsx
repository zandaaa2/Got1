import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Redirect /discover to /browse - discover page is paused for now
export default async function DiscoverPage() {
  redirect('/browse')
}

