import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import VerificationBadge from '@/components/shared/VerificationBadge'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import AuthButtons from '@/components/auth/AuthButtons'
import { colleges } from '@/lib/colleges'
import { createServerClient } from '@/lib/supabase'
export const dynamic = 'force-dynamic'
export const revalidate = 0



interface ScoutProfile {
  id: string
  full_name: string | null
  organization: string | null
  position: string | null
  avatar_url: string | null
  price_per_eval: number | null
  suspended_until?: string | null
  sports?: string[] | null
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
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, organization, position, avatar_url, price_per_eval, suspended_until, sports')
    .eq('role', 'scout')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Error loading scouts for team page:', error)
  }

  let userProfile: { avatar_url: string | null } | null = null
  if (session?.user?.id) {
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', session.user.id)
      .single()
    userProfile = currentUser ?? null
  }

  const now = new Date()
  const teamKey = normalizeValue(team.name)

  const scouts: ScoutProfile[] = (data || []).filter((profile) => {
    if (!profile.organization) return false

    const suspensionEnds = profile.suspended_until
    if (suspensionEnds && typeof suspensionEnds === 'string' && new Date(suspensionEnds) > now) {
      return false
    }

    const normalizedOrg = normalizeValue(profile.organization)
    if (!normalizedOrg) return false

    return (
      normalizedOrg === teamKey ||
      normalizedOrg.includes(teamKey) ||
      teamKey.includes(normalizedOrg)
    )
  })

  const sportMap = new Map<string, ScoutProfile[]>()
  const unspecifiedScouts: ScoutProfile[] = []

  scouts.forEach((scout) => {
    const sportsArray = Array.isArray(scout.sports) ? scout.sports : []
    const uniqueSports = Array.from(new Set(sportsArray.filter(Boolean)))

    if (uniqueSports.length === 0) {
      unspecifiedScouts.push(scout)
      return
    }

    uniqueSports.forEach((sport) => {
      const normalizedSport = sport.trim()
      if (!normalizedSport) return
      const list = sportMap.get(normalizedSport) ?? []
      list.push(scout)
      sportMap.set(normalizedSport, list)
    })
  })

  const sportGroups = Array.from(sportMap.entries()).sort((a, b) => b[1].length - a[1].length)

  const headerContent = session ? (
    <Link href="/profile" className="cursor-pointer hover:opacity-80 transition-opacity">
      {userProfile?.avatar_url ? (
        <Image
          src={userProfile.avatar_url}
          alt="Profile"
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
          <span className="text-gray-600 font-semibold">U</span>
        </div>
      )}
    </Link>
  ) : (
    <AuthButtons />
  )

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="browse" />
      <DynamicLayout header={headerContent}>
        <div className="max-w-5xl mx-auto space-y-10 px-4 sm:px-0">
          <div className="flex justify-start">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
            >
              Back
            </Link>
          </div>

          <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6 md:p-8">
            <div className="w-24 h-24 md:w-32 md:h-32 mx-auto md:mx-0 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center overflow-hidden">
              {team.logo ? (
                <Image
                  src={team.logo}
                  alt={team.name}
                  width={128}
                  height={128}
                  className="object-contain"
                 
                />
              ) : (
                <span className="text-3xl font-semibold text-gray-600">
                  {team.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
                {team.name}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm md:text-base text-gray-600 mb-4">
                {team.conference && (
                  <span className="font-medium text-black">
                    {team.conference}
                  </span>
                )}
                {team.division && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs sm:text-sm">
                    {team.division}
                  </span>
                )}
                <span className="text-gray-500">
                  {scouts.length} scout{scouts.length === 1 ? '' : 's'} on Got1
                </span>
              </div>
              <p className="text-sm md:text-base text-gray-600">
                View active Got1 scouts who evaluate for {team.name}.
              </p>
            </div>
          </div>

          <section>
            <div className="mb-6 text-center md:text-left">
              <h2 className="text-lg md:text-xl font-semibold text-black">
                Scouts on Got1
              </h2>
              <p className="text-sm md:text-base text-gray-600">
                These scouts list {team.name} as their current organization on Got1.
              </p>
            </div>

            {scouts.length === 0 ? (
              <div className="border border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center text-gray-500">
                No scouts from {team.name} are on the platform yet. Check back soon!
              </div>
            ) : sportGroups.length > 0 ? (
              <div className="space-y-10">
                {sportGroups.map(([sport, sportScouts]) => (
                  <div key={sport} className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h3 className="text-base md:text-lg font-semibold text-black">
                        {sport}
                      </h3>
                      <span className="text-xs md:text-sm text-gray-500">
                        {sportScouts.length} scout{sportScouts.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {sportScouts.map((scout) => (
                        <Link
                          key={`${sport}-${scout.id}`}
                          href={`/profile/${scout.id}`}
                          className="flex items-center gap-3 md:gap-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                            {scout.avatar_url ? (
                              <Image
                                src={scout.avatar_url}
                                alt={scout.full_name || 'Scout'}
                                width={56}
                                height={56}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-300 flex items-center justify-center text-lg font-semibold text-gray-600">
                                {scout.full_name?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-black text-base md:text-lg flex items-center gap-2 truncate">
                              {scout.full_name || 'Scout'}
                              <VerificationBadge />
                            </h4>
                            <p className="text-xs md:text-sm text-gray-600 truncate">
                              {scout.position || 'Scout'}
                            </p>
                          </div>
                          {typeof scout.price_per_eval === 'number' && (
                            <div className="flex-shrink-0 text-right">
                              <p className="text-sm md:text-base text-blue-600 font-semibold">
                                ${scout.price_per_eval}
                              </p>
                              <p className="text-xs text-gray-400">per evaluation</p>
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                {unspecifiedScouts.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base md:text-lg font-semibold text-black">
                        Other Scouts
                      </h3>
                      <span className="text-xs md:text-sm text-gray-500">
                        {unspecifiedScouts.length} scout{unspecifiedScouts.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {unspecifiedScouts.map((scout) => (
                        <Link
                          key={`unspecified-${scout.id}`}
                          href={`/profile/${scout.id}`}
                          className="flex items-center gap-3 md:gap-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                            {scout.avatar_url ? (
                              <Image
                                src={scout.avatar_url}
                                alt={scout.full_name || 'Scout'}
                                width={56}
                                height={56}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-300 flex items-center justify-center text-lg font-semibold text-gray-600">
                                {scout.full_name?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-black text-base md:text-lg flex items-center gap-2 truncate">
                              {scout.full_name || 'Scout'}
                              <VerificationBadge />
                            </h4>
                            <p className="text-xs md:text-sm text-gray-600 truncate">
                              {scout.position || 'Scout'}
                            </p>
                          </div>
                          {typeof scout.price_per_eval === 'number' && (
                            <div className="flex-shrink-0 text-right">
                              <p className="text-sm md:text-base text-blue-600 font-semibold">
                                ${scout.price_per_eval}
                              </p>
                              <p className="text-xs text-gray-400">per evaluation</p>
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {scouts.map((scout) => (
                  <Link
                    key={scout.id}
                    href={`/profile/${scout.id}`}
                    className="flex items-center gap-3 md:gap-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {scout.avatar_url ? (
                        <Image
                          src={scout.avatar_url}
                          alt={scout.full_name || 'Scout'}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300 flex items-center justify-center text-lg font-semibold text-gray-600">
                          {scout.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-black text-base md:text-lg flex items-center gap-2 truncate">
                        {scout.full_name || 'Scout'}
                        <VerificationBadge />
                      </h3>
                      <p className="text-xs md:text-sm text-gray-600 truncate">
                        {scout.position || 'Scout'}
                      </p>
                    </div>
                    {typeof scout.price_per_eval === 'number' && (
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm md:text-base text-blue-600 font-semibold">
                          ${scout.price_per_eval}
                        </p>
                        <p className="text-xs text-gray-400">per evaluation</p>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </DynamicLayout>
    </div>
  )
}

