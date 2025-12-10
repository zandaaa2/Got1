'use client'

import { useState, useEffect, useCallback, useMemo, MouseEvent, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import Image from 'next/image'
import VerificationBadge from '@/components/shared/VerificationBadge'
import { colleges } from '@/lib/colleges'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getProfilePath } from '@/lib/profile-url'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { useRouter } from 'next/navigation'

interface DiscoverContentProps {
  session: any
  organizations: string[]
  hasSession: boolean
  profileAvatars: Array<{
    id: string
    avatar_url: string | null
    full_name: string | null
  }>
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
  suspended_until?: string | null
  turnaround_time?: string | null
  positions?: string[] | string | null
  college_connections?: string[] | string | null
  bio?: string | null
  credentials?: string | null
  scout_category?: 'pro' | 'd1-college' | 'smaller-college' | null
}

interface TeamEntry {
  name: string
  slug: string
  logo?: string
  conference?: string
  division?: string
  scoutCount: number
  connectionCount: number
  hasActivity: boolean
}

export default function DiscoverContent({ 
  session, 
  organizations, 
  hasSession, 
  profileAvatars 
}: DiscoverContentProps) {
  console.log('🎯 DiscoverContent component rendered', { hasSession, organizationsCount: organizations.length })
  
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'scout' | 'player'>('all')
  const [viewMode, setViewMode] = useState<'profiles' | 'universities'>('profiles') // Default to profiles view
  const [divisionFilter, setDivisionFilter] = useState<'all' | 'D1' | 'D2' | 'D3' | 'FBS' | 'FCS' | 'NAIA'>('all')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [currentUserPosition, setCurrentUserPosition] = useState<string | null>(null)
  const [playerOffers, setPlayerOffers] = useState<Map<string, Array<{ school: string; school_slug: string | null }>>>(new Map())
  const supabase = useMemo(() => createClient(), [])
  const { openSignUp } = useAuthModal()
  const router = useRouter()

  const loadProfiles = useCallback(async () => {
    console.log('🔄 ===== loadProfiles CALLED =====')
    console.log('🔄 Session check:', session ? 'Has session' : 'No session')
    setLoading(true)
    
    try {
      // Verify Supabase client is working
      console.log('🔄 Testing Supabase client...')
      const { data: testData, error: testError } = await supabase.auth.getSession()
      console.log('🔄 Session test result:', { 
        hasSession: !!testData?.session, 
        userId: testData?.session?.user?.id,
        error: testError 
      })
      
      console.log('🔄 Starting profiles query...')
      const queryStartTime = Date.now()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, username, full_name, organization, position, school, graduation_year, avatar_url, role, price_per_eval, turnaround_time, suspended_until, positions, college_connections, bio, credentials, scout_category')
        .order('full_name', { ascending: true })
      const queryEndTime = Date.now()

      console.log('🔄 Query completed in', queryEndTime - queryStartTime, 'ms')
      console.log('🔄 Query result - Error:', error)
      console.log('🔄 Query result - Data length:', data?.length ?? 0)
      
      if (error) {
        console.error('❌ ===== QUERY ERROR =====')
        console.error('❌ Error code:', error.code)
        console.error('❌ Error message:', error.message)
        console.error('❌ Error details:', error.details)
        console.error('❌ Error hint:', error.hint)
        console.error('❌ Full error object:', JSON.stringify(error, null, 2))
      }
      
      if (data && data.length > 0) {
        console.log('✅ Got data! First profile:', data[0])
      } else if (!error) {
        console.warn('⚠️ Query succeeded but returned 0 rows')
      }

      if (error) {
        console.error('❌ Error loading profiles:', error)
        console.error('❌ Error details:', JSON.stringify(error, null, 2))
        setProfiles([])
        setLoading(false)
        return
      }
      
      // Filter client-side: exclude suspended scouts and basic users
      const now = new Date()
      const isProduction = typeof window !== 'undefined' && 
        !window.location.hostname.includes('localhost') && 
        !window.location.hostname.includes('127.0.0.1')
      
      console.log('🔄 Filtering profiles. Raw count:', data?.length || 0)
      
      const activeProfiles = (data || []).filter(p => {
        // Hide "ella k" in production
        if (isProduction && p.full_name?.toLowerCase() === 'ella k') {
          return false
        }
        
        // Hide basic users (role = 'user')
        if (p.role === 'user') {
          return false
        }
        
        // If it's a scout and suspended, exclude it
        if (p.role === 'scout') {
          const suspendedUntil = p.suspended_until
          // If no suspension date or empty string, scout is active
          if (!suspendedUntil || typeof suspendedUntil !== 'string') return true
          // If suspension date is in the future, scout is suspended (exclude)
          // If suspension date is in the past, scout is active (include)
          return new Date(suspendedUntil) <= now
        }
        
        return true
      })
      
      console.log('✅ Discover: Loaded profiles from database:', data?.length || 0)
      if (data && data.length > 0) {
        console.log('✅ Discover: Sample profiles:', data.slice(0, 3).map(p => ({ 
          id: p.id, 
          name: p.full_name, 
          role: p.role,
          suspended: p.suspended_until 
        })))
        console.log('✅ Discover: Role distribution:', {
          scout: data.filter(p => p.role === 'scout').length,
          player: data.filter(p => p.role === 'player').length,
          parent: data.filter(p => p.role === 'parent').length,
          user: data.filter(p => p.role === 'user').length,
          other: data.filter(p => !['scout', 'player', 'parent', 'user'].includes(p.role)).length
        })
      } else {
        console.warn('⚠️ Discover: Query returned 0 profiles from database')
      }
      console.log('✅ Discover: Active profiles after filtering:', activeProfiles.length)
      console.log('✅ Discover: Scouts count:', activeProfiles.filter(p => p.role === 'scout').length)
      console.log('✅ Discover: Players count:', activeProfiles.filter(p => p.role === 'player').length)
      console.log('✅ Discover: All roles:', Array.from(new Set(activeProfiles.map(p => p.role))))
      
      setProfiles(activeProfiles)
    } catch (error: any) {
      console.error('❌ Exception in loadProfiles:', error)
      console.error('❌ Exception stack:', error?.stack)
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }, [supabase, session])

  // Directly call loadProfiles on mount - simpler approach
  useEffect(() => {
    console.log('🔄 ===== MOUNT: Calling loadProfiles directly =====')
    loadProfiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount - loadProfiles is stable via useCallback

  // Load player offers for search functionality
  useEffect(() => {
    const loadPlayerOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('player_offers')
          .select('profile_id, school, school_slug')

        if (error) {
          console.error('Error loading player offers:', error)
          return
        }

        const offersMap = new Map<string, Array<{ school: string; school_slug: string | null }>>()
        
        if (data) {
          data.forEach((offer) => {
            const existing = offersMap.get(offer.profile_id) || []
            existing.push({
              school: offer.school,
              school_slug: offer.school_slug,
            })
            offersMap.set(offer.profile_id, existing)
          })
        }

        setPlayerOffers(offersMap)
      } catch (error) {
        console.error('Error loading player offers:', error)
      }
    }

    loadPlayerOffers()
  }, [supabase])

  // Load current user's role
  useEffect(() => {
    const loadCurrentUserRole = async () => {
      if (!session?.user?.id) {
        setCurrentUserRole(null)
        setCurrentUserPosition(null)
        return
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('role, position')
        .eq('user_id', session.user.id)
        .maybeSingle()
      
      setCurrentUserRole(data?.role || null)
      setCurrentUserPosition(data?.position || null)
    }
    
    loadCurrentUserRole()
  }, [session, supabase])

  const normalizedColleges = useMemo(() => {
    if (!colleges || !Array.isArray(colleges)) return []
    return colleges.map((college) => ({
      ...college,
      normalizedName: college.name.toLowerCase(),
      normalizedSimple: college.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    }))
  }, [colleges])

  // Filter profiles with all the same logic as BrowseContent
  const trimmedQuery = searchQuery.trim().toLowerCase()
  const isProduction = typeof window !== 'undefined' && 
    !window.location.hostname.includes('localhost') && 
    !window.location.hostname.includes('127.0.0.1')

  const findCollegeMatch = useCallback((organization: string) => {
    if (!normalizedColleges || normalizedColleges.length === 0) return null
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

  // Build team entries (for universities view) - same logic as BrowseContent
  const teamEntries = useMemo<TeamEntry[]>(() => {
    if (!colleges || !Array.isArray(colleges)) return []
    
    const teamsMap = new Map<string, TeamEntry>()
    
    // Count scouts and connections per college
    profiles.forEach(profile => {
      if (profile.role === 'scout' && profile.organization) {
        const college = findCollegeMatch(profile.organization)
        if (college) {
          const existing = teamsMap.get(college.slug) || {
            name: college.name,
            slug: college.slug,
            logo: college.logo,
            conference: college.conference,
            division: college.division,
            scoutCount: 0,
            connectionCount: 0,
            hasActivity: false,
          }
          existing.scoutCount++
          existing.hasActivity = true
          teamsMap.set(college.slug, existing)
        }
      }
      
      // Count connections
      if (profile.role === 'scout' && profile.college_connections) {
        let connections: string[] = []
        try {
          if (typeof profile.college_connections === 'string') {
            connections = JSON.parse(profile.college_connections)
          } else if (Array.isArray(profile.college_connections)) {
            connections = profile.college_connections
          }
        } catch {
          connections = []
        }
        
        connections.forEach(slug => {
          const college = normalizedColleges.find(c => c.slug === slug)
          if (college) {
            const existing = teamsMap.get(slug) || {
              name: college.name,
              slug: college.slug,
              logo: college.logo,
              conference: college.conference,
              division: college.division,
              scoutCount: 0,
              connectionCount: 0,
              hasActivity: false,
            }
            existing.connectionCount++
            existing.hasActivity = true
            teamsMap.set(slug, existing)
          }
        })
      }
    })
    
    // Add all colleges that don't have activity
    colleges
      .filter((college) => college.slug !== 'got1')
      .forEach((college) => {
        if (!teamsMap.has(college.slug)) {
          teamsMap.set(college.slug, {
            name: college.name,
            slug: college.slug,
            logo: college.logo,
            conference: college.conference,
            division: college.division,
            scoutCount: 0,
            connectionCount: 0,
            hasActivity: false,
          })
        }
      })
    
    return Array.from(teamsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [profiles, normalizedColleges, findCollegeMatch])

  const filteredTeams = useMemo(() => {
    return teamEntries.filter((team) => {
      if (divisionFilter !== 'all') {
        if (divisionFilter === 'D1') {
          if (team.division !== 'FBS' && team.division !== 'FCS') {
            return false
          }
        } else {
          if (team.division !== divisionFilter) {
            return false
          }
        }
      }
      
      if (!trimmedQuery) return true
      
      return (
        team.name.toLowerCase().includes(trimmedQuery) ||
        (team.conference && team.conference.toLowerCase().includes(trimmedQuery)) ||
        team.slug.toLowerCase().includes(trimmedQuery)
      )
    })
  }, [teamEntries, divisionFilter, trimmedQuery])

  const availableDivisions = useMemo(() => {
    const divisions = new Set<string>()
    teamEntries.forEach(team => {
      if (team.division) {
        if (team.division === 'FBS' || team.division === 'FCS') {
          divisions.add('D1')
        }
        divisions.add(team.division)
      }
    })
    return Array.from(divisions).sort()
  }, [teamEntries])

  const handleCardClick = useCallback((profile: Profile) => {
    router.push(getProfilePath(profile.id, profile.username))
  }, [router])

  const handlePrimaryAction = useCallback((event: MouseEvent<HTMLButtonElement>, profile: Profile) => {
    event.stopPropagation()
    event.preventDefault()
    
    if (!session) {
      openSignUp()
      return
    }

    if (profile.role === 'scout') {
      if (currentUserRole !== 'player') {
        alert('Only players can purchase evaluations. Please create a player profile to purchase evaluations.')
        return
      }
      router.push(`/profile/${profile.id}/purchase`)
    } else {
      router.push(getProfilePath(profile.id, profile.username))
    }
  }, [openSignUp, router, session, currentUserRole])

  const handleScoutsClick = () => {
    console.log('🔵 handleScoutsClick called, current viewMode:', viewMode, 'roleFilter:', roleFilter)
    if (viewMode === 'universities') {
      setViewMode('profiles')
      setRoleFilter('scout')
      return
    }
    // Toggle: if already on scout, go to all. Otherwise go to scout.
    const newFilter = roleFilter === 'scout' ? 'all' : 'scout'
    console.log('🔵 Setting roleFilter to:', newFilter)
    setRoleFilter(newFilter)
  }

  const handlePlayersClick = () => {
    console.log('🔵 handlePlayersClick called, current viewMode:', viewMode, 'roleFilter:', roleFilter)
    if (viewMode === 'universities') {
      setViewMode('profiles')
      setRoleFilter('player')
      return
    }
    // Toggle: if already on player, go to all. Otherwise go to player.
    const newFilter = roleFilter === 'player' ? 'all' : 'player'
    console.log('🔵 Setting roleFilter to:', newFilter)
    setRoleFilter(newFilter)
  }

  const handleUniversitiesClick = () => {
    if (viewMode === 'universities') {
      setViewMode('profiles')
      setRoleFilter('all')
      setDivisionFilter('all')
      return
    }
    setViewMode('universities')
    if (roleFilter !== 'all') {
      setRoleFilter('all')
    }
  }

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

  const renderProfileRow = useCallback((profile: Profile) => {
    const avatarUrl =
      isMeaningfulAvatar(profile.avatar_url) && !imageErrors.has(profile.id)
        ? profile.avatar_url || undefined
        : undefined

    const isScout = profile.role === 'scout'
    const collegeMatch = profile.organization ? findCollegeMatch(profile.organization) : null
    
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
            <span className="truncate">{profile.full_name || profile.username || 'Unknown'}</span>
            {isScout && <VerificationBadge className="flex-shrink-0" />}
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
  }, [findCollegeMatch, getProfileSubtitle, imageErrors, roleFilter])

  const filteredProfiles = useMemo(() => {
    console.log('🔍 filteredProfiles calculation started:', {
      profilesCount: profiles.length,
      roleFilter,
      trimmedQuery: trimmedQuery || '(none)',
      viewMode
    })
    
    const filtered = profiles.filter((profile) => {
      // Hide "ella k" in production
      if (isProduction && profile.full_name?.toLowerCase() === 'ella k') {
        return false
      }
      
      const query = trimmedQuery
      
      // If no query, filter by role
      if (!query) {
        if (roleFilter === 'all') {
          // Default to scouts only when no filter/search
          const isScout = profile.role === 'scout'
          console.log(`  Profile ${profile.id} (${profile.full_name}): role=${profile.role}, roleFilter=all, isScout=${isScout}`)
          return isScout
        }
        const matchesRole = profile.role === roleFilter
        console.log(`  Profile ${profile.id} (${profile.full_name}): role=${profile.role}, roleFilter=${roleFilter}, matches=${matchesRole}`)
        return matchesRole
      }
      
      // When searching, exclude parents from scout/player filters
      if (roleFilter !== 'all' && profile.role === 'parent') {
        return false
      }
      
      // Basic profile search
      const matchesBasicSearch = (
        profile.full_name?.toLowerCase().includes(query) ||
        profile.organization?.toLowerCase().includes(query) ||
        profile.school?.toLowerCase().includes(query) ||
        profile.position?.toLowerCase().includes(query) ||
        profile.bio?.toLowerCase().includes(query) ||
        profile.credentials?.toLowerCase().includes(query)
      )
      
      // Check college connections and offers (same logic as BrowseContent)
      let matchesCollegeConnection = false
      
      if (profile.role === 'player' && query) {
        const offers = playerOffers.get(profile.id) || []
        if (offers.length > 0) {
          matchesCollegeConnection = offers.some((offer) => {
            if (!offer.school) return false
            const offerSchoolLower = offer.school.toLowerCase().trim()
            const queryLower = query.toLowerCase().trim()
            if (offerSchoolLower.includes(queryLower) || queryLower.includes(offerSchoolLower)) {
              return true
            }
            // Additional college matching logic can be added here if needed
            return false
          })
        }
      }
      
      if (profile.role === 'scout' && query && normalizedColleges && normalizedColleges.length > 0) {
        let collegeSlugs: string[] = []
        try {
          if (profile.college_connections && typeof profile.college_connections === 'string') {
            collegeSlugs = JSON.parse(profile.college_connections)
          } else if (Array.isArray(profile.college_connections)) {
            collegeSlugs = profile.college_connections
          }
        } catch {
          collegeSlugs = []
        }
        
        if (collegeSlugs.length > 0) {
          matchesCollegeConnection = collegeSlugs.some(slug => {
            if (!slug) return false
            const college = normalizedColleges.find(c => c && c.slug === slug)
            if (!college || !college.name) return false
            return (
              college.name.toLowerCase().includes(query) ||
              (college.conference && college.conference.toLowerCase().includes(query)) ||
              slug.toLowerCase().includes(query)
            )
          })
        }
      }
      
      const matchesSearch = matchesBasicSearch || matchesCollegeConnection
      const matchesRole = roleFilter === 'all' 
        ? profile.role !== 'parent' || trimmedQuery.length > 0
        : profile.role === roleFilter
      
      return matchesSearch && matchesRole
    })
    
    console.log('🔍 filteredProfiles result:', filtered.length, 'profiles')
    if (filtered.length > 0) {
      console.log('  First few:', filtered.slice(0, 3).map(p => ({ id: p.id, name: p.full_name, role: p.role })))
    }
    
    return filtered
  }, [profiles, trimmedQuery, roleFilter, isProduction, normalizedColleges, playerOffers])

  // For discover sections, use all scouts from profiles (not filtered)
  // For filtered view, use filteredProfiles
  const scoutsForCategories = useMemo(() => {
    // If no search and roleFilter is 'all', use all scouts from profiles
    // Otherwise use filteredProfiles
    if (!trimmedQuery && roleFilter === 'all' && viewMode === 'profiles') {
      const allScouts = profiles.filter(p => p.role === 'scout')
      console.log('✅ Discover: scoutsForCategories (from profiles):', allScouts.length)
      return allScouts
    }
    const filteredScouts = filteredProfiles.filter(p => p.role === 'scout')
    console.log('✅ Discover: scoutsForCategories (from filteredProfiles):', filteredScouts.length)
    return filteredScouts
  }, [profiles, filteredProfiles, trimmedQuery, roleFilter, viewMode])

  // Group profiles by category
  const proScouts = useMemo(() => {
    const pro = scoutsForCategories.filter(p => p.scout_category === 'pro')
    console.log('✅ Discover: proScouts count:', pro.length)
    return pro
  }, [scoutsForCategories])
  
  const d1CollegeScouts = useMemo(() => {
    const d1 = scoutsForCategories.filter(p => p.scout_category === 'd1-college')
    console.log('✅ Discover: d1CollegeScouts count:', d1.length)
    return d1
  }, [scoutsForCategories])
  
  const smallerCollegeScouts = useMemo(() => {
    const smaller = scoutsForCategories.filter(p => p.scout_category === 'smaller-college')
    console.log('✅ Discover: smallerCollegeScouts count:', smaller.length)
    return smaller
  }, [scoutsForCategories])

  // Featured scouts (top 6, mix of categories) - always from all scouts
  const featuredScouts = useMemo(() => {
    const allScouts = profiles.filter(p => p.role === 'scout')
    if (allScouts.length === 0) return []
    const shuffled = [...allScouts].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 6)
  }, [profiles])

  const renderExpertCard = useCallback((profile: Profile) => {
    const avatarUrl =
      isMeaningfulAvatar(profile.avatar_url) && !imageErrors.has(profile.id)
        ? profile.avatar_url || undefined
        : undefined

    // Build job title
    const jobTitle = profile.position && profile.organization
      ? `${profile.position} at ${profile.organization}`
      : profile.position || profile.organization || 'Football Expert'
    
    // Brief description
    const briefDescription = profile.bio || profile.credentials || ''
    
    // Find team logo - match organization to college data
    const collegeMatch = profile.organization ? findCollegeMatch(profile.organization) : null
    
    return (
      <Link
        key={profile.id}
        href={getProfilePath(profile.id, profile.username)}
        className="cursor-pointer bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
      >
        {/* Profile Picture - Square, full width at top */}
        <div className="w-full aspect-square relative overflow-hidden bg-gray-100">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={profile.full_name || 'Profile'}
              fill
              className="object-cover"
              onError={() => {
                setImageErrors((prev) => new Set(prev).add(profile.id))
              }}
              unoptimized
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center text-4xl font-semibold text-white ${getGradientForId(
                profile.user_id || profile.id || profile.username || profile.full_name || 'profile'
              )}`}
            >
              {profile.full_name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Content below image */}
        <div className="p-4">
          {/* Name with verification badge */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-black text-lg leading-tight">
              {profile.full_name || profile.username || 'Unknown'}
            </h3>
            <VerificationBadge className="flex-shrink-0" />
          </div>

          {/* Job Title */}
          <p className="text-sm text-gray-600 mb-2 leading-tight">
            {jobTitle}
          </p>

          {/* Team Logo and Name */}
          {collegeMatch && (
            <div className="flex items-center gap-2 mb-2">
              {collegeMatch.logo && (
                <div className="w-5 h-5 rounded-full bg-white border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                  <Image
                    src={collegeMatch.logo}
                    alt={collegeMatch.name}
                    width={20}
                    height={20}
                    className="object-contain w-full h-full"
                    unoptimized
                  />
                </div>
              )}
              <p className="text-xs text-gray-500 truncate">
                {collegeMatch.name}
              </p>
            </div>
          )}

          {/* Brief Description - 2-3 lines max */}
          {briefDescription && (
            <p className="text-sm text-gray-700 line-clamp-3 leading-snug">
              {briefDescription}
            </p>
          )}
        </div>
      </Link>
    )
  }, [imageErrors, findCollegeMatch])

  // Determine if we should show discover-style sections or browse-style list
  const showDiscoverSections = !trimmedQuery && roleFilter === 'all' && viewMode === 'profiles'
  
  // Debug logging
  useEffect(() => {
    console.log('✅ Discover Debug:')
    console.log('  - profiles.length:', profiles.length)
    console.log('  - profiles (roles):', profiles.map(p => ({ id: p.id, name: p.full_name, role: p.role })))
    console.log('  - filteredProfiles.length:', filteredProfiles.length)
    console.log('  - filteredProfiles (roles):', filteredProfiles.map(p => ({ id: p.id, name: p.full_name, role: p.role })))
    console.log('  - scoutsForCategories.length:', scoutsForCategories.length)
    console.log('  - featuredScouts.length:', featuredScouts.length)
    console.log('  - proScouts.length:', proScouts.length)
    console.log('  - d1CollegeScouts.length:', d1CollegeScouts.length)
    console.log('  - smallerCollegeScouts.length:', smallerCollegeScouts.length)
    console.log('  - showDiscoverSections:', showDiscoverSections)
    console.log('  - trimmedQuery:', trimmedQuery)
    console.log('  - roleFilter:', roleFilter)
    console.log('  - viewMode:', viewMode)
    console.log('  - loading:', loading)
  }, [profiles, filteredProfiles, scoutsForCategories.length, featuredScouts.length, proScouts.length, d1CollegeScouts.length, smallerCollegeScouts.length, showDiscoverSections, trimmedQuery, roleFilter, viewMode, loading])

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Search Bar at Top */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
            <svg
              className="text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ width: '20px', height: '20px' }}
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
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-gray-300 text-base"
          />
        </div>
        
        {/* Filter Tabs */}
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                console.log('🔵 Scouts button clicked')
                handleScoutsClick()
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                viewMode === 'profiles' && roleFilter === 'scout'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Scouts
            </button>
            <button
              onClick={() => {
                console.log('🔵 Players button clicked')
                handlePlayersClick()
              }}
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
            
            {/* Clear filters button */}
            {viewMode === 'profiles' && roleFilter !== 'all' && (
              <button
                onClick={() => setRoleFilter('all')}
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
          
          {/* Division Tabs - only show when on Universities view */}
          {viewMode === 'universities' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setDivisionFilter('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  divisionFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {availableDivisions.includes('D1') && (
                <button
                  onClick={() => setDivisionFilter('D1')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    divisionFilter === 'D1'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  D1
                </button>
              )}
              {availableDivisions.includes('D2') && (
                <button
                  onClick={() => setDivisionFilter('D2')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    divisionFilter === 'D2'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  D2
                </button>
              )}
              {availableDivisions.includes('D3') && (
                <button
                  onClick={() => setDivisionFilter('D3')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    divisionFilter === 'D3'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  D3
                </button>
              )}
              {availableDivisions.includes('FBS') && (
                <button
                  onClick={() => setDivisionFilter('FBS')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    divisionFilter === 'FBS'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  FBS
                </button>
              )}
              {availableDivisions.includes('FCS') && (
                <button
                  onClick={() => setDivisionFilter('FCS')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    divisionFilter === 'FCS'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  FCS
                </button>
              )}
              {availableDivisions.includes('NAIA') && (
                <button
                  onClick={() => setDivisionFilter('NAIA')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    divisionFilter === 'NAIA'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  NAIA
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No profiles found.
        </div>
      ) : viewMode === 'universities' ? (
        /* Universities View */
        filteredTeams.length > 0 ? (
          <div className="space-y-8">
            {filteredTeams.filter(team => team.hasActivity).length > 0 && (
              <div>
                <h2 className="text-lg md:text-xl font-bold text-black mb-4">Active on Got1</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {filteredTeams
                    .filter(team => team.hasActivity)
                    .map((team) => {
                      const totalActivity = team.scoutCount + team.connectionCount
                      const activityText = team.scoutCount > 0 && team.connectionCount > 0
                        ? `${team.scoutCount} employee${team.scoutCount === 1 ? '' : 's'} • ${team.connectionCount} connection${team.connectionCount === 1 ? '' : 's'}`
                        : team.scoutCount > 0
                        ? `${team.scoutCount} employee${team.scoutCount === 1 ? '' : 's'}`
                        : `${team.connectionCount} connection${team.connectionCount === 1 ? '' : 's'}`
                      
                      return (
                        <Link
                          key={team.slug}
                          href={`/teams/${team.slug}`}
                          className="bg-white border border-gray-200 rounded-lg flex items-center gap-4 p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                            {team.logo ? (
                              <Image
                                src={team.logo}
                                alt={team.name}
                                width={64}
                                height={64}
                                className="object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="text-lg font-semibold text-gray-600">
                                {team.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <h3 className="font-bold text-black text-base md:text-lg truncate">{team.name}</h3>
                            <p className="text-xs md:text-sm text-gray-600 truncate">
                              {team.conference ? team.conference : 'Conference not specified'}
                              {team.division ? ` · ${team.division}` : ''}
                            </p>
                            <p className="text-xs md:text-sm text-gray-500 truncate">
                              {activityText}
                            </p>
                          </div>
                        </Link>
                      )
                    })}
                </div>
              </div>
            )}

            {filteredTeams.filter(team => !team.hasActivity).length > 0 && (
              <div>
                <h2 className="text-lg md:text-xl font-bold text-black mb-4">Not Yet on Got1</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {filteredTeams
                    .filter(team => !team.hasActivity)
                    .map((team) => (
                      <Link
                        key={team.slug}
                        href={`/teams/${team.slug}`}
                        className="bg-white border border-gray-200 rounded-lg flex items-center gap-4 p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                          {team.logo ? (
                            <Image
                              src={team.logo}
                              alt={team.name}
                              width={64}
                              height={64}
                              className="object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-lg font-semibold text-gray-600">
                              {team.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <h3 className="font-bold text-black text-base md:text-lg truncate">{team.name}</h3>
                          <p className="text-xs md:text-sm text-gray-600 truncate">
                            {team.conference ? team.conference : 'Conference not specified'}
                            {team.division ? ` · ${team.division}` : ''}
                          </p>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No universities found matching your search.
          </div>
        )
      ) : showDiscoverSections ? (
        /* Discover-style sections (when no search/filters) */
        <>
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-black mb-4 leading-tight">
              Choose your connection. Get an evaluation. Change your kid's life.
            </h1>
          </div>

      {/* Featured Scouts */}
      {featuredScouts.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-6">Featured Scouts</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredScouts.map(renderExpertCard)}
          </div>
        </div>
      )}

      {/* Show all scouts - always show this if we have scouts */}
      {scoutsForCategories.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-6">All Scouts</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {scoutsForCategories.slice(0, 12).map(renderExpertCard)}
          </div>
        </div>
      )}
      
      {/* Pro Section */}
      {proScouts.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-black">Pro</h2>
            {proScouts.length > 6 && (
              <Link href="/discover?category=pro" className="text-sm text-gray-600 hover:text-black">
                See all →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {proScouts.slice(0, 6).map(renderExpertCard)}
          </div>
        </div>
      )}

      {/* D1 College Section */}
      {d1CollegeScouts.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-black">D1 College</h2>
            {d1CollegeScouts.length > 6 && (
              <Link href="/discover?category=d1-college" className="text-sm text-gray-600 hover:text-black">
                See all →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {d1CollegeScouts.slice(0, 6).map(renderExpertCard)}
          </div>
        </div>
      )}

      {/* Smaller College Section */}
      {smallerCollegeScouts.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-black">Smaller College</h2>
            {smallerCollegeScouts.length > 6 && (
              <Link href="/discover?category=smaller-college" className="text-sm text-gray-600 hover:text-black">
                See all →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {smallerCollegeScouts.slice(0, 6).map(renderExpertCard)}
          </div>
        </div>
      )}

      {/* Fallback: If no categorized sections have content, show all profiles in list format */}
      {featuredScouts.length === 0 && proScouts.length === 0 && d1CollegeScouts.length === 0 && smallerCollegeScouts.length === 0 && scoutsForCategories.length === 0 && filteredProfiles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-6">All Profiles</h2>
          {filteredProfiles.map(renderProfileRow)}
        </div>
      )}
      
      {/* Final fallback: Show message if absolutely nothing */}
      {featuredScouts.length === 0 && proScouts.length === 0 && d1CollegeScouts.length === 0 && smallerCollegeScouts.length === 0 && scoutsForCategories.length === 0 && filteredProfiles.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          No profiles available.
        </div>
      )}

        </>
      ) : (
        /* Browse-style list (when search/filters are active) */
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filteredProfiles.length > 0 ? (
            filteredProfiles.map(renderProfileRow)
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No profiles found matching your search.</p>
              <p className="text-sm mt-2">Try adjusting your filters or search terms.</p>
              {roleFilter === 'scout' && (
                <p className="text-xs mt-2 text-gray-400">Debug: roleFilter=scout, viewMode={viewMode}, query={trimmedQuery || '(none)'}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


