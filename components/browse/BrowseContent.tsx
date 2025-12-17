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
  positions?: string[] | string | null // JSONB array or JSON string
  college_connections?: string[] | string | null // JSONB array or JSON string
  stripe_account_id?: string | null
  free_eval_enabled?: boolean | null
  free_eval_description?: string | null
}

interface TeamEntry {
  name: string
  slug: string
  logo?: string
  conference?: string
  division?: string
  scoutCount: number
  connectionCount: number
  hasActivity: boolean // true if has employees OR connections
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
  const [divisionFilter, setDivisionFilter] = useState<'all' | 'D1' | 'D2' | 'D3' | 'FBS' | 'FCS' | 'NAIA'>('all')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [currentUserPosition, setCurrentUserPosition] = useState<string | null>(null)
  const [playerOffers, setPlayerOffers] = useState<Map<string, Array<{ school: string; school_slug: string | null }>>>(new Map())
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
    console.log('🔄 loadProfiles called')
    setLoading(true)
    try {
      console.log('🔄 Starting Supabase query...')
      // Build query step by step to avoid any construction issues
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, username, full_name, organization, position, school, graduation_year, avatar_url, role, price_per_eval, turnaround_time, suspended_until, positions, college_connections, stripe_account_id, free_eval_enabled, free_eval_description')
        .order('full_name', { ascending: true })

      console.log('🔄 Query completed. Error:', error, 'Data length:', data?.length ?? 0)

      if (error) {
        console.error('❌ Error loading profiles:', error)
        console.error('❌ Error details:', JSON.stringify(error, null, 2))
        console.error('❌ Error code:', error.code)
        console.error('❌ Error message:', error.message)
        setProfiles([])
        setLoading(false)
        return
      }
      
      console.log('✅ Loaded profiles from database:', data?.length || 0)
      if (data && data.length > 0) {
        console.log('✅ First few profiles:', data.slice(0, 3).map(p => ({ id: p.id, name: p.full_name, role: p.role })))
        console.log('✅ Role distribution:', {
          scout: data.filter(p => p.role === 'scout').length,
          player: data.filter(p => p.role === 'player').length,
          parent: data.filter(p => p.role === 'parent').length,
          user: data.filter(p => p.role === 'user').length
        })
      } else {
        console.warn('⚠️ Query returned 0 profiles from database')
      }
      
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
        
        // Hide "chasity" from scout listings
        if (p.role === 'scout' && (p.full_name?.toLowerCase().includes('chasity') || p.username?.toLowerCase() === 'chasity')) {
          return false
        }
        
        // Hide basic users (role = 'user')
        if (p.role === 'user') {
          return false
        }
        
        // If it's a scout, check if they have Stripe setup and are not suspended
        if (p.role === 'scout') {
          // Exclude scouts without Stripe account setup
          if (!p.stripe_account_id || p.stripe_account_id.trim() === '') {
            return false
          }
          
          // Exclude suspended scouts
          const suspendedUntil = p.suspended_until
          if (suspendedUntil && typeof suspendedUntil === 'string') {
            return new Date(suspendedUntil) <= now
          }
          return true
        }
        
        return true
      })
      
      console.log('✅ Filtered active profiles:', activeProfiles.length)
      console.log('Active profiles:', activeProfiles.map(p => ({ id: p.id, name: p.full_name, role: p.role })))
      
      // Debug: Check for specific players that should be visible
      const harrisonProfile = (data || []).find(p => p.full_name?.toLowerCase().includes('harrison') && p.full_name?.toLowerCase().includes('houch'))
      if (harrisonProfile) {
        console.log('🔍 Harrison Houch profile found:', {
          id: harrisonProfile.id,
          full_name: harrisonProfile.full_name,
          role: harrisonProfile.role,
          username: harrisonProfile.username,
          in_filtered: activeProfiles.some(p => p.id === harrisonProfile.id),
          filtered_out_reason: harrisonProfile.role === 'user' ? 'role is user' : 
                               (harrisonProfile.role !== 'player' ? `role is ${harrisonProfile.role}` : 'should be visible')
        })
      }
      
      // Debug: Check for zanderplayer account
      const zanderPlayerProfile = (data || []).find(p => p.username?.toLowerCase() === 'zanderplayer' || p.full_name?.toLowerCase().includes('zanderplayer'))
      if (zanderPlayerProfile) {
        console.log('🔍 Zanderplayer profile found:', {
          id: zanderPlayerProfile.id,
          full_name: zanderPlayerProfile.full_name,
          role: zanderPlayerProfile.role,
          username: zanderPlayerProfile.username,
          in_filtered: activeProfiles.some(p => p.id === zanderPlayerProfile.id),
          filtered_out_reason: zanderPlayerProfile.role === 'user' ? 'role is user' : 
                               (zanderPlayerProfile.role !== 'player' ? `role is ${zanderPlayerProfile.role}` : 'should be visible')
        })
      }
      
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
    console.log('🔄 useEffect triggered - calling loadProfiles')
    loadProfiles()
  }, [loadProfiles])

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

        // Create a map of profile_id -> offers
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

        console.log('✅ Loaded player offers:', offersMap.size, 'players with offers')
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

  // Refresh profiles when window regains focus (helps catch updates)
  useEffect(() => {
    const handleFocus = () => {
      loadProfiles()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loadProfiles])

  // Set up real-time subscription for profile changes
  useEffect(() => {
    console.log('🔄 Setting up real-time subscription for profiles')
    
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('🔄 Profile change detected:', payload.eventType, payload.new || payload.old)
          // Reload profiles when any change occurs
          loadProfiles()
        }
      )
      .subscribe()

    return () => {
      console.log('🔄 Cleaning up real-time subscription')
      supabase.removeChannel(channel)
    }
  }, [supabase, loadProfiles])

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

  const normalizedColleges = useMemo(() => {
    if (!colleges || !Array.isArray(colleges)) {
      console.warn('⚠️ colleges array is empty or not an array:', colleges)
      return []
    }
    console.log('✅ Normalizing colleges:', colleges.length, 'total colleges')
    return colleges.map((college) => ({
      ...college,
      normalizedName: college.name.toLowerCase(),
      normalizedSimple: college.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    }))
  }, [colleges])

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
            <span className="truncate">{profile.full_name || profile.username || 'Unknown'}</span>
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
    
    // Check if this scout is recommended for the current player
    const isRecommended = (() => {
      if (currentUserRole !== 'player' || !currentUserPosition || !isScout) return false
      
      let scoutPositions: string[] = []
      try {
        if (profile.positions && typeof profile.positions === 'string') {
          scoutPositions = JSON.parse(profile.positions)
        } else if (Array.isArray(profile.positions)) {
          scoutPositions = profile.positions
        }
      } catch {
        scoutPositions = []
      }
      
      // Only recommend if scout has specific positions selected (not "All") AND player's position matches
      // If scout has no positions selected (means "All"), don't recommend
      if (scoutPositions.length === 0) return false
      
      // Check if player's position matches any scout position
      return scoutPositions.some(pos => 
        pos.toLowerCase() === currentUserPosition.toLowerCase() ||
        currentUserPosition.toLowerCase().includes(pos.toLowerCase()) ||
        pos.toLowerCase().includes(currentUserPosition.toLowerCase())
      )
    })()
    
    // Get scout's positions for display
    let scoutPositions: string[] = []
    if (isScout) {
      try {
        if (profile.positions && typeof profile.positions === 'string') {
          scoutPositions = JSON.parse(profile.positions)
        } else if (Array.isArray(profile.positions)) {
          scoutPositions = profile.positions
        }
      } catch {
        scoutPositions = []
      }
    }
    
    return (
      <div
        key={profile.id}
        onClick={() => handleCardClick(profile)}
        className="cursor-pointer rounded-2xl bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center border border-gray-200 relative overflow-hidden group"
      >
        {/* Subtle gradient accent at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Recommended for you tag */}
        {isRecommended && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold shadow-sm border border-green-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Recommended for you
            </span>
          </div>
        )}
        
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
          <h3 className="font-bold text-black text-xl">{profile.full_name || profile.username || 'Unknown'}</h3>
          {isScout && <VerificationBadge className="flex-shrink-0" />}
          {isTestAccount(profile.full_name) && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
              test account
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-3">{getProfileSubtitle(profile)}</p>

        {/* Positions and Connections */}
        {isScout && (
          <div className="mb-4 w-full space-y-2.5">
            {/* Positions */}
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Positions</p>
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {scoutPositions.length > 0 ? (
                  <>
                    {scoutPositions.slice(0, 3).map((pos) => (
                      <span
                        key={pos}
                        className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium"
                      >
                        {pos}
                      </span>
                    ))}
                    {scoutPositions.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                        +{scoutPositions.length - 3}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                    All positions
                  </span>
                )}
              </div>
            </div>
            
            {/* Connections */}
            {(() => {
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
              return collegeSlugs.length > 0 ? (
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Connections with</p>
                  <div className="flex items-center justify-center gap-1 -space-x-1">
                    {collegeSlugs.slice(0, 3).map((slug) => {
                      const college = normalizedColleges.find((c) => c.slug === slug)
                      if (!college) return null
                      return (
                        <div
                          key={slug}
                          className="w-7 h-7 rounded-full bg-white border-2 border-white overflow-hidden flex items-center justify-center shadow-sm"
                          title={college.name}
                        >
                          {college.logo ? (
                            <Image
                              src={college.logo}
                              alt={college.name}
                              width={28}
                              height={28}
                              className="object-contain w-full h-full"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-semibold bg-gray-100 text-gray-600">
                              {college.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {collegeSlugs.length > 3 && (
                      <span className="text-xs text-gray-500 font-medium ml-1">+{collegeSlugs.length - 3}</span>
                    )}
                  </div>
                </div>
              ) : null
            })()}
          </div>
        )}

        {/* Simplified Price and Turnaround */}
        {isScout && (
          <div className="flex items-center justify-center gap-2 mb-4 text-sm text-gray-600">
            <span className="font-semibold text-black">${price}</span>
            <span>•</span>
            <span>{turnaround}</span>
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

  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>()

    profiles.forEach((profile) => {
      // Check college_connections for both scouts and players
      if (!profile.college_connections) return

      let collegeSlugs: string[] = []
      try {
        if (typeof profile.college_connections === 'string') {
          collegeSlugs = JSON.parse(profile.college_connections)
        } else if (Array.isArray(profile.college_connections)) {
          collegeSlugs = profile.college_connections
        }
      } catch {
        collegeSlugs = []
      }

      // Count each connection
      collegeSlugs.forEach((slug) => {
        if (slug && normalizedColleges.find((c) => c.slug === slug)) {
          counts.set(slug, (counts.get(slug) || 0) + 1)
        }
      })
    })

    return counts
  }, [profiles, normalizedColleges])

  const teamEntries = useMemo<TeamEntry[]>(() => {
    if (!normalizedColleges || normalizedColleges.length === 0) {
      console.warn('⚠️ normalizedColleges is empty')
      return []
    }
    const entries = normalizedColleges
      .filter((college) => college.slug !== 'got1') // Exclude Got1 from universities list
      .map<TeamEntry>((college) => {
        const employeeCount = organizationCounts.get(college.slug) || 0
        const connectionCount = connectionCounts.get(college.slug) || 0
        const hasActivity = employeeCount > 0 || connectionCount > 0
        
        return {
          name: college.name,
          slug: college.slug,
          logo: college.logo,
          conference: college.conference,
          division: college.division,
          scoutCount: employeeCount,
          connectionCount: connectionCount,
          hasActivity: hasActivity,
        }
      })
      .sort((a, b) => {
        // Sort by activity first (hasActivity = true comes first), then alphabetically
        if (a.hasActivity !== b.hasActivity) {
          return a.hasActivity ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
    console.log('✅ Created teamEntries:', entries.length, 'teams')
    return entries
  }, [normalizedColleges, organizationCounts, connectionCounts])

  // Get available divisions from teamEntries
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

  const trimmedQuery = searchQuery.trim().toLowerCase()

  // Check if we're in production (not localhost)
  // Only show "ella k" on localhost - hide on all other domains (got1.app, gotone.app, vercel.app, etc.)
  const isProduction = typeof window !== 'undefined' && 
    !window.location.hostname.includes('localhost') && 
    !window.location.hostname.includes('127.0.0.1')

  const filteredProfiles = useMemo(() => {
    console.log('🔍 filteredProfiles calculation:', {
      profilesCount: profiles.length,
      roleFilter,
      trimmedQuery: trimmedQuery || '(none)',
      viewMode
    })
    
    const filtered = profiles.filter((profile) => {
      // Hide "ella k" in production (keep visible on localhost)
      if (isProduction && profile.full_name?.toLowerCase() === 'ella k') {
        return false
      }
      
      // Search query filter
      const query = trimmedQuery
      
      // If no query, don't filter (show all that match role)
      // Exclude parents from default "all" view, but allow them in search
      if (!query) {
        // On "all" page with no search, only show scouts (not players or parents)
        if (roleFilter === 'all' && profile.role !== 'scout') {
          return false
        }
        let matchesRole = roleFilter === 'all' || profile.role === roleFilter
        
        // Price filtering: 
        // - Default view (roleFilter === 'all'): only show scouts with price different than $99
        // - Scouts tab (roleFilter === 'scout'): show ALL scouts regardless of price
        if (profile.role === 'scout' && roleFilter === 'all') {
          const price = profile.price_per_eval
          if (!price || price === 99) {
            matchesRole = false
          }
        }
        
        return matchesRole
      }
      
      // When searching, exclude parents from scout/player filters, but include in 'all'
      if (roleFilter !== 'all' && profile.role === 'parent') {
        return false
      }
      
      // Basic profile search
      const matchesBasicSearch = (
        profile.full_name?.toLowerCase().includes(query) ||
        profile.organization?.toLowerCase().includes(query) ||
        profile.school?.toLowerCase().includes(query) ||
        profile.position?.toLowerCase().includes(query)
      )
      
      // Check if search matches any college/university (for connections and offers)
      let matchesCollegeConnection = false
      
      // For players: check if they have offers from the searched university
      if (profile.role === 'player' && query) {
        const offers = playerOffers.get(profile.id) || []
        if (offers.length > 0) {
          matchesCollegeConnection = offers.some((offer) => {
            if (!offer.school) return false
            
            const offerSchoolLower = offer.school.toLowerCase().trim()
            const queryLower = query.toLowerCase().trim()
            
            // Check if the offer's school name matches the search query directly
            if (offerSchoolLower.includes(queryLower) || queryLower.includes(offerSchoolLower)) {
              return true
            }
            
            // If we have normalized colleges, check against college database
            if (normalizedColleges && normalizedColleges.length > 0) {
              // Check if the school slug matches any college that matches the search
              if (offer.school_slug) {
                const college = normalizedColleges.find((c) => c.slug === offer.school_slug)
                if (college) {
                  return (
                    college.name.toLowerCase().includes(queryLower) ||
                    (college.conference && college.conference.toLowerCase().includes(queryLower)) ||
                    college.slug.toLowerCase().includes(queryLower)
                  )
                }
              }
              
              // Try to match the school name to a college in the database
              for (const college of normalizedColleges) {
                const collegeNameLower = college.name.toLowerCase()
                
                // Check if offer school name matches or contains college name (or vice versa)
                if (collegeNameLower === offerSchoolLower || 
                    offerSchoolLower.includes(collegeNameLower) || 
                    collegeNameLower.includes(offerSchoolLower)) {
                  // If we found a match between offer school and a college, check if that college matches the search
                  const collegeMatchesSearch = (
                    college.name.toLowerCase().includes(queryLower) ||
                    (college.conference && college.conference.toLowerCase().includes(queryLower)) ||
                    college.slug.toLowerCase().includes(queryLower)
                  )
                  if (collegeMatchesSearch) {
                    return true
                  }
                }
              }
            }
            
            return false
          })
        }
      }
      
      // For scouts: check if they have connections with the searched university
      if (profile.role === 'scout' && query && normalizedColleges && normalizedColleges.length > 0) {
        // Check if profile has connections that match the search
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
        
        // Check if any connected college matches the search query
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
        
        // Also check if the organization (college they work for) matches
        if (!matchesCollegeConnection && profile.organization) {
          try {
            const orgMatch = findCollegeMatch(profile.organization)
            if (orgMatch && orgMatch.name) {
              matchesCollegeConnection = !!(
                orgMatch.name.toLowerCase().includes(query) ||
                (orgMatch.conference && orgMatch.conference.toLowerCase().includes(query)) ||
                (orgMatch.slug && orgMatch.slug.toLowerCase().includes(query))
              )
            }
          } catch (error) {
            // Silently fail if there's an error matching
            console.error('Error matching college:', error)
          }
        }
      }
      
      const matchesSearch = matchesBasicSearch || matchesCollegeConnection
      
      // Role filter - exclude parents from scout/player filters, but include in 'all' for search
      let matchesRole = roleFilter === 'all' 
        ? profile.role !== 'parent' || trimmedQuery.length > 0 // Include parents only if searching
        : (profile.role === roleFilter) // roleFilter is 'scout' or 'player', so this already excludes 'parent'
      
      // Price filtering: 
      // - Default view (roleFilter === 'all'): only show scouts with price different than $99
      // - Scouts tab (roleFilter === 'scout'): show ALL scouts regardless of price
      if (profile.role === 'scout' && roleFilter === 'all') {
        const price = profile.price_per_eval
        if (!price || price === 99) {
          matchesRole = false
        }
      }
      
      return matchesSearch && matchesRole
    })
    
    console.log('🔍 filteredProfiles result:', filtered.length, 'profiles after filtering')
    
    // Randomize order for scouts when showing all or scouts filter
    if (roleFilter === 'all' || roleFilter === 'scout') {
      // Separate scouts and non-scouts
      const scouts = filtered.filter(p => p.role === 'scout')
      const nonScouts = filtered.filter(p => p.role !== 'scout')
      
      // Helper function to shuffle array
      const shuffleArray = <T,>(array: T[]): T[] => {
        const shuffled = [...array]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
      }
      
      // Check if current user is a player with a position
      if (currentUserRole === 'player' && currentUserPosition) {
        // Separate recommended and non-recommended scouts
        const recommended: Profile[] = []
        const notRecommended: Profile[] = []
        
        scouts.forEach(scout => {
          let scoutPositions: string[] = []
          try {
            if (scout.positions && typeof scout.positions === 'string') {
              scoutPositions = JSON.parse(scout.positions)
            } else if (Array.isArray(scout.positions)) {
              scoutPositions = scout.positions
            }
          } catch {
            scoutPositions = []
          }
          
          // Only recommend if scout has specific positions selected (not "All") AND player's position matches
          // If scout has no positions selected (means "All"), don't recommend
          if (scoutPositions.length === 0) {
            notRecommended.push(scout)
          } else {
            // Check if player's position matches any scout position
            const isRecommended = scoutPositions.some(pos => 
              pos.toLowerCase() === currentUserPosition.toLowerCase() ||
              currentUserPosition.toLowerCase().includes(pos.toLowerCase()) ||
              pos.toLowerCase().includes(currentUserPosition.toLowerCase())
            )
            
            if (isRecommended) {
              recommended.push(scout)
            } else {
              notRecommended.push(scout)
            }
          }
        })
        
        // Shuffle both groups separately and return recommended first
        return [...shuffleArray(recommended), ...shuffleArray(notRecommended), ...nonScouts]
      } else {
        // No player position to match against, just randomize all scouts
        return [...shuffleArray(scouts), ...nonScouts]
      }
    }
    
    return filtered
  }, [profiles, trimmedQuery, roleFilter, isProduction, currentUserRole, currentUserPosition, normalizedColleges, findCollegeMatch, playerOffers])

  const filteredTeams = useMemo(() => {
    return teamEntries.filter((team) => {
      // Filter by division
      if (divisionFilter !== 'all') {
        if (divisionFilter === 'D1') {
          // D1 includes both FBS and FCS
          if (team.division !== 'FBS' && team.division !== 'FCS') {
            return false
          }
        } else {
          // For other divisions, match exactly
          if (team.division !== divisionFilter) {
            return false
          }
        }
      }
      
      // Filter by search query
      const query = trimmedQuery
      if (!query) return true
      return (
        team.name.toLowerCase().includes(query) ||
        team.conference?.toLowerCase().includes(query) ||
        team.division?.toLowerCase().includes(query) ||
        team.slug.toLowerCase().includes(query)
      )
    })
  }, [teamEntries, divisionFilter, trimmedQuery])

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
      setDivisionFilter('all')
      return
    }
    setViewMode('universities')
    if (roleFilter !== 'all') {
      setRoleFilter('all')
    }
    // Keep division filter as is when switching to universities
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
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setViewMode('profiles')
                setRoleFilter('all')
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                viewMode === 'profiles' && roleFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Home
            </button>
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
            
            {/* Clear filters button - only show when filters are active (not on Home tab) */}
            {viewMode === 'profiles' && roleFilter !== 'all' && (
              <button
                onClick={() => {
                  setViewMode('profiles')
                  setRoleFilter('all')
                }}
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
      ) : viewMode === 'universities' ? (
        filteredTeams.length > 0 ? (
          <div className="space-y-8">
            {/* Universities with Activity (Employees or Connections) */}
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
                                onError={(e) => {
                                  console.warn(`❌ Logo failed: ${team.name} - ${team.logo}`);
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
                            <h3 className="font-bold text-black text-base md:text-lg truncate overflow-hidden text-ellipsis whitespace-nowrap min-w-0">{team.name}</h3>
                            <p className="text-xs md:text-sm text-gray-600 truncate overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                              {team.conference ? team.conference : 'Conference not specified'}
                              {team.division ? ` · ${team.division}` : ''}
                            </p>
                            <p className="text-xs md:text-sm text-gray-500 truncate overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                              {activityText}
                            </p>
                          </div>
                        </Link>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Universities without Activity */}
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
                              onError={(e) => {
                                console.warn(`Logo failed to load for ${team.name}: ${team.logo}`);
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
                          <h3 className="font-bold text-black text-base md:text-lg truncate overflow-hidden text-ellipsis whitespace-nowrap min-w-0">{team.name}</h3>
                          <p className="text-xs md:text-sm text-gray-600 truncate overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                            {team.conference ? team.conference : 'Conference not specified'}
                            {team.division ? ` · ${team.division}` : ''}
                          </p>
                          <p className="text-xs md:text-sm text-gray-500 truncate overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                            No activity on Got1
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
                          onError={(e) => {
                            console.warn(`❌ Logo failed: ${team.name} - ${team.logo}`);
                            e.currentTarget.style.display = 'none';
                          }}
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
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {filteredProfiles.map(renderProfileCard)}
              </div>
              
              {/* Become a Scout CTA for non-signed-in users */}
              {!session && (
                <div className="flex flex-col items-center justify-center mt-12 md:mt-16 mb-8 md:mb-12">
                  <p className="text-sm md:text-base text-gray-600 text-center mb-4 max-w-md">
                    Want to monetize your scouting expertise? Join our platform and start evaluating talent today.
                  </p>
                  <button
                    onClick={() => {
                      // Store the intended destination in localStorage
                      localStorage.setItem('postSignUpRedirect', '/profile/scout-application')
                      // Open sign-up modal
                      openSignUp()
                    }}
                    className="interactive-press inline-flex items-center justify-center px-8 py-3 rounded-full text-white font-semibold hover:opacity-90 transition-opacity text-base md:text-lg"
                    style={{ backgroundColor: '#233dff' }}
                  >
                    Become a Scout
                  </button>
                </div>
              )}
            </>
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

