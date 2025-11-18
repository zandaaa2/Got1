import { createServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'

const ProfileView = dynamic(() => import('@/components/profile/ProfileView'), {
  ssr: false,
})
import AuthButtons from '@/components/auth/AuthButtons'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'
import type { Metadata } from 'next'

const RESERVED_USERNAMES = new Set([
  'profile',
  'profiles',
  'browse',
  'teams',
  'team',
  'api',
  'terms-of-service',
  'privacy-policy',
  'login',
  'signup',
  'my-evals',
  'evaluations',
  'stripe',
  'auth',
  'admin',
  'settings',
  'money',
  'marketing',
  'high-school',
  'high-schools',
  'favicon.ico',
])

interface UsernamePageProps {
  params: {
    username: string
  }
}

export async function generateMetadata({ params }: UsernamePageProps): Promise<Metadata> {
  const rawUsername = params.username?.toLowerCase()
  if (!rawUsername || RESERVED_USERNAMES.has(rawUsername)) {
    return {
      title: 'Profile Not Found | Got1',
      description: 'This Got1 profile could not be located.',
    }
  }

  const supabase = createServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, full_name, role, position, organization, school, graduation_year')
    .eq('username', rawUsername)
    .maybeSingle()

  if (!profile) {
    return {
      title: 'Profile Not Found | Got1',
      description: 'This Got1 profile could not be located.',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://got1.app'
  const profilePath = profile.username ? `/${profile.username}` : `/profile/${profile.id}`
  const absoluteUrl = `${baseUrl}${profilePath}`
  const name = profile.full_name || 'Got1 Profile'
  const description = profile.role === 'scout'
    ? `View ${name}'s scouting background and request an evaluation on Got1.`
    : `See ${name}'s player profile and film evaluations on Got1.`

  return {
    title: `${name} | Got1`,
    description,
    alternates: { canonical: profilePath },
    openGraph: {
      title: `${name} | Got1`,
      description,
      url: absoluteUrl,
      type: profile.role === 'scout' ? 'profile' : 'article',
      images: [
        { url: '/social/og-default.png', width: 1200, height: 630, alt: `${name} on Got1` },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | Got1`,
      description,
      images: ['/social/og-default.png'],
    },
  }
}

export default async function UsernameProfilePage({ params }: UsernamePageProps) {
  const rawUsername = params.username?.toLowerCase()

  if (!rawUsername || RESERVED_USERNAMES.has(rawUsername)) {
    notFound()
  }

  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', rawUsername)
    .single()

  if (!profile) {
    notFound()
  }

  // Hide "ella k" from production (keep visible on localhost)
  // Check the hostname from the request headers for reliable detection
  // Only show "ella k" on localhost - hide on all other domains (got1.app, gotone.app, vercel.app, etc.)
  const headersList = headers()
  const hostname = headersList.get('host') || headersList.get('x-forwarded-host') || ''
  const isProduction = !hostname.includes('localhost') && !hostname.includes('127.0.0.1')
  
  if (isProduction && profile.full_name?.toLowerCase() === 'ella k') {
    notFound() // Returns 404 in production
  }

  const isOwnProfile = session?.user?.id === profile.user_id

  let userProfile = null
  if (session) {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url, full_name, username')
      .eq('user_id', session.user.id)
      .single()
    userProfile = data
  }

  const headerContent = session ? (
    <HeaderUserAvatar
      userId={session.user.id}
      avatarUrl={userProfile?.avatar_url}
      fullName={userProfile?.full_name || session.user.user_metadata?.full_name}
      username={userProfile?.username}
      email={session.user.email}
    />
  ) : (
    <AuthButtons />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={headerContent}>
        <ProfileView profile={profile} isOwnProfile={isOwnProfile} />
      </DynamicLayout>
    </div>
  )
}
