'use client'

import { useState, useEffect, useCallback, useMemo, MouseEvent } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import Image from 'next/image'
import VerificationBadge from '@/components/shared/VerificationBadge'
import { colleges, getCollegeLogo } from '@/lib/colleges'
import { EmptyState } from '@/components/shared/EmptyState'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getProfilePath } from '@/lib/profile-url'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { useRouter } from 'next/navigation'

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
  turnaround_time?: string | null
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
  const [viewMode, setViewMode] = useState<'profiles' | 'universities'>('profiles')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const supabase = createClient()
  const { openSignUp } = useAuthModal()
  const router = useRouter()
  
  // Test accounts that should show the badge
  const testAccountNames = ['russell westbrooks', 'ray lewois', 'ella k']
  
  const isTestAccount = (fullName: string | null) => {
    if (!fullName) return false
    return testAccountNames.includes(fullName.toLowerCase())
  }

  const loadProfiles = useCallback(async () => {
    try {
      // Build query step by step to avoid any construction issues
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, username, full_name, organization, position, school, graduation_year, avatar_url, role, price_per_eval, turnaround_time, suspended_until')
        .order('full_name', { ascending: true })

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
      // Check if we're in production (not localhost)
      // Only show "ella k" on localhost - hide on all other domains (got1.app, gotone.app, vercel.app, etc.)
      const isProduction = typeof window !== 'undefined' && 
        !window.location.hostname.includes('localhost') && 
        !window.location.hostname.includes('127.0.0.1')
      
      const activeProfiles = (data || []).filter(p => {
        // Hide "ella k" in production (keep visible on localhost)
        if (isProduction && p.full_name?.toLowerCase() === 'ella k') {
          return false
        }
        
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

  // Load current user's role
  useEffect(() => {
    const loadCurrentUserRole = async () => {
      if (!session?.user?.id) {
        setCurrentUserRole(null)
        return
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle()
      
      setCurrentUserRole(data?.role || null)
    }
    
    loadCurrentUserRole()
  }, [session, supabase])

  // Refresh profiles when window regains focus (helps catch updates)
  useEffect(() => {
    const handleFocus = () => {
      loadProfiles()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loadProfiles])

  const handleCardClick = useCallback((profile: Profile) => {
    router.push(getProfilePath(profile.id, profile.username))
  }, [router])

  const handlePrimaryAction = useCallback((event: MouseEvent<HTMLButtonElement>, profile: Profile) => {
    event.stopPropagation()
    event.preventDefault()
    
    console.log('🔵 Purchase button clicked for profile:', profile.id, profile.full_name)
    console.log('🔵 Current user role:', currentUserRole)
    
    if (!session) {
      console.log('🔵 No session, opening sign up modal')
      openSignUp()
      return
    }

    if (profile.role === 'scout') {
      // Check if user is a player before navigating
      if (currentUserRole !== 'player') {
        console.log('🔵 User is not a player, showing alert')
        alert('Only players can purchase evaluations. Please create a player profile to purchase evaluations.')
        return
      }
      
      console.log('🔵 Navigating to purchase page:', `/profile/${profile.id}/purchase`)
      router.push(`/profile/${profile.id}/purchase`)
    } else {
      console.log('🔵 Not a scout, navigating to profile')
      router.push(getProfilePath(profile.id, profile.username))
    }
  }, [openSignUp, router, session, currentUserRole, getProfilePath])

  const getProfileSubtitle = useCallback((profile: Profile) => {
    if (profile.role === 'scout') {
      if (profile.position && profile.organization) {
        return `${profile.position} at ${profile.organization}`
      }
      if (profile.position) return profile.position
      if (profile.organization) return profile.organization
      return 'Scout'
    }

    if (profile.position && profile.school) {
      return `${profile.position} at ${profile.school}${profile.graduation_year ? ` (${profile.graduation_year})` : ''}`
    }
    if (profile.position) return profile.position
    if (profile.school) {
      return `${profile.school}${profile.graduation_year ? ` (${profile.graduation_year})` : ''}`
    }
    if (profile.graduation_year) {
      return `Class of ${profile.graduation_year}`
    }
    return 'Player'
  }, [])

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

  const renderProfileRow = useCallback((profile: Profile) => {
    const avatarUrl =
      isMeaningfulAvatar(profile.avatar_url) && !imageErrors.has(profile.id)
        ? profile.avatar_url || undefined
        : undefined

    const isScout = profile.role === 'scout'
    const collegeMatch = profile.organization ? findCollegeMatch(profile.organization) : null
    
    // Remove border when on specific tabs (scouts or players)
    const shouldRemoveBorder = roleFilter === 'scout' || roleFilter === 'player'
    
    return (
      <Link
        key={profile.id}
        href={getProfilePath(profile.id, profile.username)}
        className={`bg-white ${shouldRemoveBorder ? '' : 'border border-gray-200'} rounded-2xl shadow-sm flex items-center gap-4 p-4 hover:shadow-md transition-shadow`}
      >
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={profile.full_name || 'Profile'}
              width={56}
              height={56}
              className="w-full h-full object-cover"
              onError={() => {
                setImageErrors((prev) => new Set(prev).add(profile.id))
              }}
              unoptimized
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center text-lg font-semibold text-white ${getGradientForId(
                profile.user_id || profile.id || profile.username || profile.full_name || 'profile'
              )}`}
            >
              {profile.full_name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="font-bold text-black text-base md:text-lg truncate flex items-center gap-2">
            <span className="truncate">{profile.full_name || 'Unknown'}</span>
            {isScout && <VerificationBadge className="flex-shrink-0" />}
            {isTestAccount(profile.full_name) && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full flex-shrink-0">
                test account
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-600 truncate">{getProfileSubtitle(profile)}</p>
          {isScout && collegeMatch?.logo && (
            <div className="flex items-center gap-2 mt-1">
              <div className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                <Image
                  src={collegeMatch.logo}
                  alt={collegeMatch.name}
                  width={20}
                  height={20}
                  className="object-contain w-full h-full"
                  unoptimized
                />
              </div>
              <p className="text-xs text-gray-500">{collegeMatch.name}</p>
            </div>
          )}
        </div>

        {isScout && roleFilter !== 'scout' && (
          <div className="flex-shrink-0 text-right">
            <p className="text-sm md:text-base font-semibold text-blue-600">
              ${profile.price_per_eval ?? 99}
            </p>
            <p className="text-xs text-gray-500">
              {profile.turnaround_time || '72 hrs'}
            </p>
          </div>
        )}
      </Link>
    )
  }, [findCollegeMatch, getProfileSubtitle, imageErrors, setImageErrors, roleFilter, getProfilePath])

  const renderProfileCard = useCallback((profile: Profile) => {
    const avatarUrl =
      isMeaningfulAvatar(profile.avatar_url) && !imageErrors.has(profile.id)
        ? profile.avatar_url || undefined
        : undefined

    const isScout = profile.role === 'scout'
    const price = isScout ? (profile.price_per_eval ?? 99) : null
    const turnaround = isScout ? (profile.turnaround_time || '72 hrs') : null
    const collegeMatch = profile.organization ? findCollegeMatch(profile.organization) : null
    return (
      <div
        key={profile.id}
        onClick={() => handleCardClick(profile)}
        className="cursor-pointer rounded-2xl bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center border border-gray-200 relative overflow-hidden group"
      >
        {/* Subtle gradient accent at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 mb-4 shadow-md group-hover:shadow-lg transition-shadow duration-300">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={profile.full_name || 'Profile'}
              width={96}
              height={96}
              className="w-full h-full object-cover"
              onError={() => {
                setImageErrors((prev) => new Set(prev).add(profile.id))
              }}
              unoptimized
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center text-2xl font-semibold text-white ${getGradientForId(
                profile.user_id || profile.id || profile.username || profile.full_name || 'profile'
              )}`}
            >
              {profile.full_name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 justify-center flex-wrap mb-2">
          <h3 className="font-bold text-black text-xl">{profile.full_name || 'Unknown'}</h3>
          {isScout && <VerificationBadge className="flex-shrink-0" />}
          {isTestAccount(profile.full_name) && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
              test account
            </span>
          )}
        </div>

        {/* Position or organization */}
        {profile.position && (
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium text-gray-700">{profile.position}</p>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-3 min-h-[1.25rem]">{getProfileSubtitle(profile)}</p>

        {/* College logo section - always render to maintain consistent spacing */}
        <div className="flex items-center justify-center gap-2 mb-3 min-h-[2rem]">
          {isScout && collegeMatch?.logo && (
            <>
              <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shadow-sm">
                <Image
                  src={collegeMatch.logo}
                  alt={collegeMatch.name}
                  width={32}
                  height={32}
                  className="object-contain w-full h-full"
                  unoptimized
                />
              </div>
              <p className="text-xs font-medium text-gray-600">{collegeMatch.name}</p>
            </>
          )}
        </div>

        {/* Price and turnaround with icon */}
        {isScout && (
          <div className="flex items-center justify-center gap-3 mb-5 px-4 py-2 bg-blue-50 rounded-full border border-blue-100">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-blue-600">${price}</span>
            </div>
            <div className="h-4 w-px bg-blue-200" />
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700">{turnaround}</span>
            </div>
          </div>
        )}

        <button
          onClick={(event) => {
            console.log('🔵 Button clicked directly')
            handlePrimaryAction(event, profile)
          }}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg relative z-10"
          style={{ backgroundColor: '#233dff' }}
          type="button"
        >
          {isScout ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Purchase Eval
            </>
          ) : (
            'View Profile'
          )}
        </button>
      </div>
    )
  }, [findCollegeMatch, getProfileSubtitle, handleCardClick, handlePrimaryAction, imageErrors, setImageErrors])

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
      .filter((college) => college.slug !== 'got1') // Exclude Got1 from universities list
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

  // Check if we're in production (not localhost)
  // Only show "ella k" on localhost - hide on all other domains (got1.app, gotone.app, vercel.app, etc.)
  const isProduction = typeof window !== 'undefined' && 
    !window.location.hostname.includes('localhost') && 
    !window.location.hostname.includes('127.0.0.1')

  const filteredProfiles = useMemo(() => {
    const filtered = profiles.filter((profile) => {
      // Hide "ella k" in production (keep visible on localhost)
      if (isProduction && profile.full_name?.toLowerCase() === 'ella k') {
        return false
      }
      
      // On "all" page, only show scouts (not players)
      if (roleFilter === 'all' && profile.role !== 'scout') {
        return false
      }
      
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
    
    // Randomize order for scouts when showing all or scouts filter
    if (roleFilter === 'all' || roleFilter === 'scout') {
      // Separate scouts and non-scouts
      const scouts = filtered.filter(p => p.role === 'scout')
      const nonScouts = filtered.filter(p => p.role !== 'scout')
      
      // Shuffle scouts using Fisher-Yates algorithm with a seed based on current time
      // This ensures different order each time the component renders
      const shuffledScouts = [...scouts]
      for (let i = shuffledScouts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledScouts[i], shuffledScouts[j]] = [shuffledScouts[j], shuffledScouts[i]]
      }
      
      // Return scouts first (randomized), then others
      return [...shuffledScouts, ...nonScouts]
    }
    
    return filtered
  }, [profiles, trimmedQuery, roleFilter, isProduction])

  const filteredTeams = teamEntries.filter((team) => {
    const query = trimmedQuery
    return (
      team.name.toLowerCase().includes(query) ||
      team.conference?.toLowerCase().includes(query || '') ||
      team.division?.toLowerCase().includes(query || '')
    )
  })

  const showTeamHighlights = viewMode !== 'universities' && trimmedQuery.length > 0 && filteredTeams.length > 0

  const handleScoutsClick = () => {
    if (viewMode === 'universities') {
      setViewMode('profiles')
      setRoleFilter('scout')
      return
    }
    setRoleFilter(roleFilter === 'scout' ? 'all' : 'scout')
  }

  const handlePlayersClick = () => {
    if (viewMode === 'universities') {
      setViewMode('profiles')
      setRoleFilter('player')
      return
    }
    setRoleFilter(roleFilter === 'player' ? 'all' : 'player')
  }

  const handleUniversitiesClick = () => {
    if (viewMode === 'universities') {
      setViewMode('profiles')
      setRoleFilter('all')
      return
    }
    setViewMode('universities')
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
            placeholder="Search people, universities..."
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
            onClick={handleUniversitiesClick}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              viewMode === 'universities'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Universities
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
      ) : viewMode === 'universities' ? (
        filteredTeams.length > 0 ? (
          <div className="space-y-8">
            {/* Represented Universities */}
            {filteredTeams.filter(team => team.scoutCount > 0).length > 0 && (
              <div>
                <h2 className="text-lg md:text-xl font-bold text-black mb-4">Represented</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {filteredTeams
                    .filter(team => team.scoutCount > 0)
                    .map((team) => (
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
              </div>
            )}

            {/* Nonrepresented Universities */}
            {filteredTeams.filter(team => team.scoutCount === 0).length > 0 && (
              <div>
                <h2 className="text-lg md:text-xl font-bold text-black mb-4">Nonrepresented</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {filteredTeams
                    .filter(team => team.scoutCount === 0)
                    .map((team) => (
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
                            No scouts on Got1
                          </p>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={emptyTeamsIcon}
            title="No universities found"
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
        <div className="space-y-6">
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

          {/* Show cards for "all" view, rows for filtered views (scouts/players) */}
          {roleFilter === 'all' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {filteredProfiles.map(renderProfileCard)}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProfiles.map(renderProfileRow)}
            </div>
          )}

          {filteredProfiles.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No profiles found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

