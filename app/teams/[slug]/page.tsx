import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import dynamicImport from 'next/dynamic'

import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthButtons from '@/components/auth/AuthButtons'
import WelcomeFooter from '@/components/welcome/WelcomeFooter'
import BackButton from '@/components/shared/BackButton'
import { colleges } from '@/lib/colleges'
import { createServerClient } from '@/lib/supabase'
import TeamTabs from '@/components/teams/TeamTabs'

const TeamMenu = dynamicImport(() => import('@/components/shared/TeamMenu'), {
  ssr: false,
})
export const dynamic = 'force-dynamic'
export const revalidate = 0



interface Profile {
  id: string
  user_id: string | null
  full_name: string | null
  organization: string | null
  position: string | null
  avatar_url: string | null
  price_per_eval: number | null
  suspended_until?: string | null
  sports?: string[] | null
  role: 'scout' | 'player'
  college_connections?: string | any // JSONB field
}

const normalizeValue = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '')

type PageParams = {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const team = colleges.find((college) => college.slug === params.slug)

  if (!team) {
    return {
      title: 'Team Not Found | Got1',
      description: 'This Got1 team page could not be located.',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://got1.app'
  const pathName = `/teams/${team.slug}`
  const absoluteUrl = `${baseUrl}${pathName}`
  const description = `View verified Got1 scouts associated with ${team.name}.`

  return {
    title: `${team.name} | Got1 Teams`,
    description,
    alternates: { canonical: pathName },
    openGraph: {
      title: `${team.name} | Got1 Teams`,
      description,
      url: absoluteUrl,
      images: [
        { url: '/social/og-default.png', width: 1200, height: 630, alt: `${team.name} on Got1` },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${team.name} | Got1 Teams`,
      description,
      images: ['/social/og-default.png'],
    },
  }
}

export default async function TeamPage({ params }: PageParams) {
  const team = colleges.find((college) => college.slug === params.slug)

  if (!team) {
    notFound()
  }

  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Fetch all profiles (scouts and players) with college_connections
  const { data: allProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, user_id, full_name, organization, position, avatar_url, price_per_eval, suspended_until, sports, role, college_connections')
    .order('full_name', { ascending: true })

  if (profilesError) {
    console.error('Error loading profiles for team page:', profilesError)
  }

  let userProfile: { avatar_url: string | null; full_name?: string | null; username?: string | null } | null = null
  if (session?.user?.id) {
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('avatar_url, full_name, username')
      .eq('user_id', session.user.id)
      .single()
    userProfile = currentUser ?? null
  }

  const now = new Date()
  const teamKey = normalizeValue(team.name)
  const teamSlug = team.slug

  // Filter for Connections: Scouts/Players who have this college in their college_connections
  const connections: Profile[] = (allProfiles || []).filter((profile) => {
    // Skip suspended profiles
    const suspensionEnds = profile.suspended_until
    if (suspensionEnds && typeof suspensionEnds === 'string' && new Date(suspensionEnds) > now) {
      return false
    }

    // Check if college_connections contains the team slug
    if (!profile.college_connections) return false

    try {
      let connectionsArray: string[] = []
      
      // Handle JSONB field (could be string or already parsed)
      if (typeof profile.college_connections === 'string') {
        connectionsArray = JSON.parse(profile.college_connections)
      } else if (Array.isArray(profile.college_connections)) {
        connectionsArray = profile.college_connections
      } else {
        return false
      }

      // Check if team slug is in the connections array
      return connectionsArray.includes(teamSlug)
    } catch (error) {
      console.error('Error parsing college_connections for profile:', profile.id, error)
      return false
    }
  })

  // Filter for Employees: Scouts who have this university as their organization
  const employees: Profile[] = (allProfiles || []).filter((profile) => {
    // Only scouts for employees tab
    if (profile.role !== 'scout') return false

    // Skip suspended profiles
    const suspensionEnds = profile.suspended_until
    if (suspensionEnds && typeof suspensionEnds === 'string' && new Date(suspensionEnds) > now) {
      return false
    }

    if (!profile.organization) return false

    const normalizedOrg = normalizeValue(profile.organization)
    if (!normalizedOrg) return false

    return (
      normalizedOrg === teamKey ||
      normalizedOrg.includes(teamKey) ||
      teamKey.includes(normalizedOrg)
    )
  })

  // When there's no session, render without sidebar and with full-width layout
  if (!session) {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full">
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
          <main className="pt-16 md:pt-20 pb-8 px-4 md:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-10">

              <div className="relative flex flex-col md:flex-row md:items-start gap-4 md:gap-6 bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5 md:p-6">
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto md:mx-0 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {team.logo ? (
                    <Image
                      src={team.logo}
                      alt={team.name}
                      width={80}
                      height={80}
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-2xl font-semibold text-gray-600">
                      {team.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-center md:text-left relative flex items-center">
                  <div className="absolute top-0 right-0">
                    <TeamMenu 
                      teamSlug={team.slug}
                      teamName={team.name}
                      isSignedIn={!!session}
                    />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-xl md:text-2xl font-bold text-black mb-1.5">
                      {team.name}
                    </h1>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs md:text-sm text-gray-600">
                      {team.conference && (
                        <span className="font-medium text-black">
                          {team.conference}
                        </span>
                      )}
                      {team.division && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                          {team.division}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs Component */}
              <TeamTabs 
                connections={connections}
                employees={employees}
                teamName={team.name}
              />
            </div>
          </main>
          <WelcomeFooter />
        </div>
      </div>
    )
  }

  // When user is signed in, render with sidebar
  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={null}>
        <div className="max-w-5xl mx-auto space-y-10 px-4 sm:px-0">
          <div className="flex justify-start">
            <BackButton fallbackUrl="/browse" className="text-sm font-medium text-gray-600 hover:text-black transition-colors" />
          </div>

          <div className="relative flex flex-col md:flex-row md:items-start gap-4 md:gap-6 bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5 md:p-6">
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto md:mx-0 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
              {team.logo ? (
                <Image
                  src={team.logo}
                  alt={team.name}
                  width={80}
                  height={80}
                  className="object-contain"
                 
                />
              ) : (
                <span className="text-2xl font-semibold text-gray-600">
                  {team.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 text-center md:text-left relative flex items-center">
              <div className="absolute top-0 right-0">
                <TeamMenu 
                  teamSlug={team.slug}
                  teamName={team.name}
                  isSignedIn={!!session}
                />
              </div>
              <div className="flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-black mb-1.5">
                  {team.name}
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs md:text-sm text-gray-600">
                  {team.conference && (
                    <span className="font-medium text-black">
                      {team.conference}
                    </span>
                  )}
                  {team.division && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                      {team.division}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Component */}
          <TeamTabs 
            connections={connections}
            employees={employees}
            teamName={team.name}
          />
        </div>
      </DynamicLayout>
    </div>
  )
}

