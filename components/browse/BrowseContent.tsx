'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import Image from 'next/image'
import VerificationBadge from '@/components/shared/VerificationBadge'
import { colleges } from '@/lib/colleges'
import { EmptyState } from '@/components/shared/EmptyState'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'

interface BrowseContentProps {
  session: any
}

interface Profile {
  id: string
  user_id?: string | null
  username?: string | null
  full_name: string
  organization: string | null
  position: string | null
  school: string | null
  graduation_year: number | null
  avatar_url: string | null
  role: string
  price_per_eval: number | null
  suspended_until?: string | null // Optional - may not exist until migration is run
}

interface TeamEntry {
  name: string
  slug: string
  logo?: string
  conference?: string
  division?: string
  scoutCount: number
}

const emptyTeamsIcon = (
  <svg
    className="h-8 w-8"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 21s-6-5.373-6-9a6 6 0 1112 0c0 3.627-6 9-6 9z" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
)

/**
 * Component for browsing and searching scouts and players.
 * Displays both scouts and players with search functionality.
 * Filters out suspended scouts client-side.
 * 
 * @param session - The current user's session
 */
export default function BrowseContent({ session }: BrowseContentProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'scout' | 'player'>('all')
  const [viewMode, setViewMode] = useState<'profiles' | 'teams'>('profiles')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const supabase = createClient()
  
  // Test accounts that should show the badge
  const testAccountNames = ['russell westbrooks', 'ray lewois', 'ella k']
  
  const isTestAccount = (fullName: string | null) => {
    if (!fullName) return false
    return testAccountNames.includes(fullName.toLowerCase())
  }

  const loadProfiles = useCallback(async () => {
    try {
      // Build query step by step to avoid any construction issues
      // Note: suspended_until may not exist yet if migration hasn't been run
      let query = supabase
        .from('profiles')
        .select('id, user_id, username, full_name, organization, position, school, graduation_year, avatar_url, role, price_per_eval, suspended_until')
      
      // Apply ordering
      query = query.order('full_name', { ascending: true })

      const { data, error } = await query

      if (error) {
        console.error('Error loading profiles:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        setProfiles([])
        return
      }
      
      console.log('✅ Loaded profiles from database:', data?.length || 0)
      console.log('Profiles data:', data?.map(p => ({ id: p.id, name: p.full_name, role: p.role, position: p.position, org: p.organization, school: p.school })))
      
      // Filter client-side: exclude suspended scouts (not players)
      // Note: suspended_until column may not exist yet - check for it before filtering
      const now = new Date()
      const activeProfiles = (data || []).filter(p => {
        // If it's a scout and suspended, exclude it
        if (p.role === 'scout') {
          const suspendedUntil = p.suspended_until
          if (!suspendedUntil || typeof suspendedUntil !== 'string') return true
          return new Date(suspendedUntil) <= now
        }
        // Players are always included
        return true
      })
      
      console.log('✅ Filtered active profiles:', activeProfiles.length)
      console.log('Active profiles:', activeProfiles.map(p => ({ id: p.id, name: p.full_name, role: p.role })))
      setProfiles(activeProfiles)
    } catch (error: any) {
      console.error('Error loading profiles:', error)
      console.error('Error message:', error?.message)
      setProfiles([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  // Refresh profiles when window regains focus (helps catch updates)
  useEffect(() => {
    const handleFocus = () => {
      loadProfiles()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loadProfiles])

  const normalizedColleges = useMemo(() =>
    colleges.map((college) => ({
      ...college,
      normalizedName: college.name.toLowerCase(),
      normalizedSimple: college.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    })),
  [])

  const findCollegeMatch = useCallback((organization: string) => {
    const normalized = organization.toLowerCase().trim()
    const normalizedSimple = normalized.replace(/[^a-z0-9]/g, '')

    return (
      normalizedColleges.find((college) => college.normalizedName === normalized) ||
      normalizedColleges.find((college) => normalized === college.normalizedName.replace('university of ', '') && college.division === 'FBS') ||
      normalizedColleges.find((college) => normalized.includes(college.normalizedName)) ||
      normalizedColleges.find((college) => college.normalizedName.includes(normalized)) ||
      normalizedColleges.find((college) => normalizedSimple === college.normalizedSimple) ||
      normalizedColleges.find((college) => normalizedSimple.includes(college.normalizedSimple))
    )
  }, [normalizedColleges])

  const organizationCounts = useMemo(() => {
    const counts = new Map<string, number>()

    profiles.forEach((profile) => {
      if (profile.role !== 'scout') return
      const organization = profile.organization?.trim()
      if (!organization) return

      const match = findCollegeMatch(organization)
      if (!match) return

      counts.set(match.slug, (counts.get(match.slug) || 0) + 1)
    })

    return counts
  }, [profiles, findCollegeMatch])

  const teamEntries = useMemo<TeamEntry[]>(() => {
    return normalizedColleges
      .map<TeamEntry>((college) => ({
        name: college.name,
        slug: college.slug,
        logo: college.logo,
        conference: college.conference,
        division: college.division,
        scoutCount: organizationCounts.get(college.slug) || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [normalizedColleges, organizationCounts])

  const trimmedQuery = searchQuery.trim().toLowerCase()

  const filteredProfiles = profiles.filter((profile) => {
    // Search query filter
    const query = trimmedQuery
    const matchesSearch = (
      profile.full_name?.toLowerCase().includes(query) ||
      profile.organization?.toLowerCase().includes(query) ||
      profile.school?.toLowerCase().includes(query) ||
      profile.position?.toLowerCase().includes(query)
    )
    
    // Role filter
    const matchesRole = roleFilter === 'all' || profile.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  const filteredTeams = teamEntries.filter((team) => {
    const query = trimmedQuery
    return (
      team.name.toLowerCase().includes(query) ||
      team.conference?.toLowerCase().includes(query || '') ||
      team.division?.toLowerCase().includes(query || '')
    )
  })

  const showTeamHighlights = viewMode !== 'teams' && trimmedQuery.length > 0 && filteredTeams.length > 0

  const handleScoutsClick = () => {
    if (viewMode === 'teams') {
      setViewMode('profiles')
      setRoleFilter('scout')
      return
    }
    setRoleFilter(roleFilter === 'scout' ? 'all' : 'scout')
  }

  const handlePlayersClick = () => {
    if (viewMode === 'teams') {
      setViewMode('profiles')
      setRoleFilter('player')
      return
    }
    setRoleFilter(roleFilter === 'player' ? 'all' : 'player')
  }

  const handleTeamsClick = () => {
    if (viewMode === 'teams') {
      setViewMode('profiles')
      setRoleFilter('all')
      return
    }
    setViewMode('teams')
    if (roleFilter !== 'all') {
      setRoleFilter('all')
    }
  }

  return (
    <div>
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-black">Browse</h1>
      </div>
      
      <div className="mb-4 md:mb-6">
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10" style={{ width: '20px', height: '20px', overflow: 'hidden' }}>
            <svg
              className="text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ width: '20px', height: '20px', display: 'block', maxWidth: '20px', maxHeight: '20px' }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search people, teams, schools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 md:py-3 bg-gray-100 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-gray-300 text-sm md:text-base"
          />
        </div>
        
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button
            onClick={handleScoutsClick}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              viewMode === 'profiles' && roleFilter === 'scout'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Scouts
          </button>
          <button
            onClick={handlePlayersClick}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              viewMode === 'profiles' && roleFilter === 'player'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Players
          </button>
          <button
            onClick={handleTeamsClick}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              viewMode === 'teams'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Teams
          </button>
          
          {/* Clear filters button - only show when filters are active */}
          {viewMode === 'profiles' && roleFilter !== 'all' && (
            <button
              onClick={() => setRoleFilter('all')}
              className="px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : viewMode === 'teams' ? (
        filteredTeams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredTeams.map((team) => (
              <Link
                key={team.slug}
                href={`/teams/${team.slug}`}
                className="surface-card flex items-center gap-4 p-4 hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                  {team.logo ? (
                    <Image
                      src={team.logo}
                      alt={team.name}
                      width={64}
                      height={64}
                      className="object-contain"
                     
                    />
                  ) : (
                    <span className="text-lg font-semibold text-gray-600">
                      {team.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <h3 className="font-bold text-black text-base md:text-lg truncate overflow-hidden text-ellipsis whitespace-nowrap min-w-0">{team.name}</h3>
                  <p className="text-xs md:text-sm text-gray-600 truncate overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                    {team.conference ? team.conference : 'Conference not specified'}
                    {team.division ? ` · ${team.division}` : ''}
                  </p>
                  <p className="text-xs md:text-sm text-gray-500 truncate overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                    {team.scoutCount} scout{team.scoutCount === 1 ? '' : 's'} on Got1
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={emptyTeamsIcon}
            title="No teams found"
            description="Try another school name, search by conference, or clear your filters to explore every program on Got1."
            action={
              trimmedQuery
                ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                  >
                    Clear search
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )
                : undefined
            }
          />
        )
      ) : (
        <div className="space-y-4">
          {showTeamHighlights && (
            <div>
              <div className="space-y-2">
                {filteredTeams.slice(0, 5).map((team) => (
                  <Link
                    key={`highlight-${team.slug}`}
                    href={`/teams/${team.slug}`}
                    className="surface-card flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {team.logo ? (
                        <Image
                          src={team.logo}
                          alt={team.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-contain"
                          unoptimized
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-sm font-semibold text-white ${getGradientForId(team.slug)}`}>
                          {team.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h3 className="font-bold text-black text-base md:text-lg truncate flex items-center gap-2 min-w-0">
                        <span className="truncate overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">
                          {team.name}
                        </span>
                      </h3>
                      <p className="text-black text-xs md:text-sm truncate overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                        {team.conference || 'Conference not specified'}
                        {team.division ? ` · ${team.division}` : ''}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm md:text-base text-blue-600">
                        {team.scoutCount} scout{team.scoutCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
          {filteredProfiles.map((profile) => (
            <Link
              key={profile.id}
              href={`/profile/${profile.id}`}
              className="flex items-center gap-3 md:gap-4 rounded-2xl bg-white p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden flex-shrink-0">
                {(() => {
                  const avatarUrl = isMeaningfulAvatar(profile.avatar_url)
                    ? profile.avatar_url ?? undefined
                    : undefined
                  const showAvatar = Boolean(avatarUrl) && !imageErrors.has(profile.id)

                  if (showAvatar) {
                    return (
                      <Image
                        src={avatarUrl!}
                        alt={profile.full_name || 'Profile'}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        onError={() => {
                          setImageErrors((prev) => new Set(prev).add(profile.id))
                        }}
                        unoptimized
                      />
                    )
                  }

                  return (
                    <div
                      className={`w-full h-full flex items-center justify-center text-sm font-semibold text-white ${getGradientForId(
                        profile.user_id || profile.id || profile.username || profile.full_name || 'profile'
                      )}`}
                    >
                      {profile.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )
                })()}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="font-bold text-black text-base md:text-lg flex items-center gap-2 min-w-0">
                  <span
                    className="truncate flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
                    title={profile.full_name || undefined}
                  >
                    {profile.full_name || 'Unknown'}
                  </span>
                  {profile.role === 'scout' && <VerificationBadge className="flex-shrink-0" />}
                  {isTestAccount(profile.full_name) && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded flex-shrink-0">
                      test account
                    </span>
                  )}
                </h3>
                <p
                  className="text-black text-xs md:text-sm truncate overflow-hidden text-ellipsis whitespace-nowrap min-w-0"
                  title={
                    profile.role === 'scout'
                      ? profile.position && profile.organization
                        ? `${profile.position} at ${profile.organization}`
                        : profile.position
                        ? profile.position
                        : profile.organization
                        ? profile.organization
                        : 'Scout'
                      : profile.position && profile.school
                      ? `${profile.position} at ${profile.school}${profile.graduation_year ? ` (${profile.graduation_year})` : ''}`
                      : profile.position
                      ? profile.position
                      : profile.school
                      ? `${profile.school}${profile.graduation_year ? ` (${profile.graduation_year})` : ''}`
                      : profile.graduation_year
                      ? `Class of ${profile.graduation_year}`
                      : 'Player'
                  }
                >
                  {profile.role === 'scout' ? (
                    profile.position && profile.organization
                      ? `${profile.position} at ${profile.organization}`
                      : profile.position
                      ? profile.position
                      : profile.organization
                      ? profile.organization
                      : 'Scout'
                  ) : (
                    profile.position && profile.school
                      ? `${profile.position} at ${profile.school}${profile.graduation_year ? ` (${profile.graduation_year})` : ''}`
                      : profile.position
                      ? profile.position
                      : profile.school
                      ? `${profile.school}${profile.graduation_year ? ` (${profile.graduation_year})` : ''}`
                      : profile.graduation_year
                      ? `Class of ${profile.graduation_year}`
                      : 'Player'
                  )}
                </p>
              </div>
              {profile.role === 'scout' && profile.price_per_eval && (
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm md:text-base text-blue-600">
                    ${profile.price_per_eval}
                  </p>
                </div>
              )}
            </Link>
          ))}

          {filteredProfiles.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No profiles found matching your search.
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  )
}

