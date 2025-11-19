import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
  // Redirect to "What's this" page as the default landing page
  redirect('/whats-this')
}

