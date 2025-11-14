import { createServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'

const ProfileView = dynamic(() => import('@/components/profile/ProfileView'), {
  ssr: false,
})
import AuthButtons from '@/components/auth/AuthButtons'
import HeaderUserAvatar from '@/components/layout/HeaderUserAvatar'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, full_name, role, position, organization, school, graduation_year')
    .eq('id', params.id)
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
  const contextLine = profile.role === 'scout'
    ? [profile.position, profile.organization].filter(Boolean).join(' · ') || 'College scout on Got1'
    : [profile.position, profile.school, profile.graduation_year ? `Class of ${profile.graduation_year}` : undefined]
        .filter(Boolean)
        .join(' · ') || 'Player on Got1'
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

export default async function ProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!profile) {
    notFound()
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

