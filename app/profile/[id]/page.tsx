import { createServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ProfileView from '@/components/profile/ProfileView'
import Sidebar from '@/components/layout/Sidebar'
import ShareButton from '@/components/shared/ShareButton'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthButtons from '@/components/auth/AuthButtons'
import Link from 'next/link'
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
      .select('avatar_url')
      .eq('user_id', session.user.id)
      .single()
    userProfile = data
  }

  const sharePath = profile?.username ? `/${profile.username}` : `/profile/${params.id}`

  const headerContent = session ? (
    <>
      <ShareButton url={sharePath} title={profile.full_name || 'Profile'} />
      <Link href="/profile" className="cursor-pointer hover:opacity-80 transition-opacity">
        {userProfile?.avatar_url ? (
          <img
            src={userProfile.avatar_url}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-600 font-semibold">U</span>
          </div>
        )}
      </Link>
    </>
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

