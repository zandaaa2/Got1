import { createServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'

import type { ProfileViewProps } from '@/components/profile/ProfileView'

const ProfileView = dynamic(() => import('@/components/profile/ProfileView'), {
  ssr: false,
}) as ComponentType<ProfileViewProps>
import AuthButtons from '@/components/auth/AuthButtons'
import WelcomeFooter from '@/components/welcome/WelcomeFooter'
import Link from 'next/link'
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
        { url: '/social/og-default.png?v=2', width: 1200, height: 630, alt: `${name} on Got1` },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | Got1`,
      description,
      images: ['/social/og-default.png?v=2'],
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

  // Parent profiles are non-clickable - return 404
  if (profile.role === 'parent') {
    notFound()
  }

  const isOwnProfile = session?.user?.id === profile.user_id

  // Fetch parent info for player profiles
  let parentProfile = null
  if (profile.role === 'player') {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Looking for parent for player:', {
        player_id: profile.id,
        player_user_id: profile.user_id,
        player_name: profile.full_name
      })
    }
    
    const { data: parentLink, error: parentLinkError } = await supabase
      .from('parent_children')
      .select('parent_id')
      .eq('player_id', profile.user_id)
      .maybeSingle()
    
    if (parentLinkError) {
      console.error('❌ Error fetching parent link:', parentLinkError)
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Parent link result:', { parentLink, error: parentLinkError })
    }
    
    if (parentLink) {
      const { data: parent, error: parentError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('user_id', parentLink.parent_id)
        .eq('role', 'parent')
        .maybeSingle()
      
      if (parentError) {
        console.error('❌ Error fetching parent profile:', parentError)
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Parent profile result:', { parent, error: parentError })
      }
      parentProfile = parent
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ No parent link found for player')
      }
    }
  }

  // When there's no session, render without sidebar and with full-width layout
  if (!session) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="fixed top-0 right-0 left-0 z-20 bg-white/90 backdrop-blur-sm px-4 py-3 md:px-8 md:py-4">
          <div className="flex w-full items-center justify-between gap-3">
            <Link
              href="/welcome"
              className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-medium text-gray-700 hover:text-black transition-colors border border-gray-300 hover:border-gray-400"
            >
              🏠 Take me home
            </Link>
            <AuthButtons />
          </div>
        </header>
        <main className="flex-1 pt-16 md:pt-20 pb-8 px-4 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">
            <ProfileView profile={profile} isOwnProfile={isOwnProfile} parentProfile={parentProfile} />
          </div>
        </main>
        <WelcomeFooter />
      </div>
    )
  }

  // When user is signed in, render with sidebar
  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={null}>
        <ProfileView profile={profile} isOwnProfile={isOwnProfile} parentProfile={parentProfile} />
      </DynamicLayout>
    </div>
  )
}
