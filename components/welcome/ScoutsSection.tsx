'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getProfilePath } from '@/lib/profile-url'
import { collegeEntries } from '@/lib/college-data'
import { createClient } from '@/lib/supabase-client'
import { useAuthModal } from '@/contexts/AuthModalContext'

interface Scout {
  id: string
  user_id?: string | null
  username?: string | null
  full_name: string | null
  organization: string | null
  position: string | null
  avatar_url: string | null
  bio?: string | null
  credentials?: string | null
  price_per_eval?: number | null
  stripe_account_id?: string | null
  college_connections?: any
}

interface ScoutsSectionProps {
  scouts: Scout[]
}

export default function ScoutsSection({ scouts: scoutsProp = [] }: ScoutsSectionProps) {
  const router = useRouter()
  const { openSignUp } = useAuthModal()
  const [hasSession, setHasSession] = useState(false)
  const [scouts, setScouts] = useState<Scout[]>(scoutsProp)
  const [loading, setLoading] = useState(true) // Start with loading true, will be set to false after initial check

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(!!session)
    }
    checkSession()
  }, [])

  // Sync with prop changes and fetch client-side if prop is empty (fallback)
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout | null = null

    const fetchScouts = async () => {
      // If we already have scouts from prop, use those immediately
      if (scoutsProp && Array.isArray(scoutsProp) && scoutsProp.length > 0) {
        console.log('ScoutsSection: Using', scoutsProp.length, 'scouts from props')
        if (mounted) {
          setScouts(scoutsProp)
          setLoading(false)
        }
        return
      }

      // Otherwise, fetch client-side (like DiscoverContent does)
      // This ensures scouts display even if server-side fetch fails or returns empty
      console.log('ScoutsSection: Fetching scouts client-side (props empty or unavailable)')
      
      // Safety timeout: if fetch takes more than 10 seconds, stop loading
      timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('ScoutsSection: Fetch timeout - stopping loading state')
          setLoading(false)
        }
      }, 10000)

      try {
        if (mounted) {
          setLoading(true)
        }
        
        const supabase = createClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_id, username, full_name, organization, position, avatar_url, bio, credentials, scout_category, price_per_eval, suspended_until, stripe_account_id, college_connections')
          .eq('role', 'scout')
          .order('created_at', { ascending: false })

        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }

        if (!mounted) return

        if (error) {
          console.error('ScoutsSection: Error fetching scouts:', error)
          setScouts([])
          setLoading(false)
          return
        }

        console.log('ScoutsSection: Raw data from Supabase:', data?.length || 0, 'scouts')

        // Filter out suspended scouts
        const now = new Date()
        const activeScouts = (data || []).filter(scout => {
          if (scout.suspended_until && typeof scout.suspended_until === 'string') {
            try {
              return new Date(scout.suspended_until) <= now
            } catch {
              return true // If date parsing fails, include the scout
            }
          }
          return true
        })

        console.log('ScoutsSection: Active scouts after filtering:', activeScouts.length)
        if (mounted) {
          setScouts(activeScouts || [])
        }
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        console.error('ScoutsSection: Error fetching scouts:', error)
        if (mounted) {
          setScouts([])
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        if (mounted) {
          setLoading(false)
          console.log('ScoutsSection: Loading complete')
        }
      }
    }

    fetchScouts()

    return () => {
      mounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [scoutsProp])

  // Parse college connections from JSONB field
  const parseCollegeConnections = (connections: any): string[] => {
    if (!connections) return []
    
    try {
      let slugs: string[] = []
      
      // Handle all possible formats from Supabase JSONB
      if (Array.isArray(connections)) {
        slugs = connections
      } else if (typeof connections === 'string') {
        try {
          const parsed = JSON.parse(connections)
          if (Array.isArray(parsed)) {
            slugs = parsed
          } else if (parsed && typeof parsed === 'object') {
            slugs = Object.values(parsed).filter(v => typeof v === 'string') as string[]
          }
        } catch {
          if (connections.trim()) {
            slugs = [connections.trim()]
          }
        }
      } else if (connections && typeof connections === 'object') {
        slugs = Object.values(connections).filter(v => typeof v === 'string') as string[]
      }
      
      return slugs.filter(slug => typeof slug === 'string' && slug.trim())
    } catch (e) {
      return []
    }
  }

  // Show all scouts on the platform
  const filteredScouts = Array.isArray(scouts) ? scouts : []

  const handleScoutClick = (scoutId: string, username: string | null | undefined) => {
    if (!hasSession) {
      openSignUp()
    } else {
      router.push(getProfilePath(scoutId, username))
    }
  }

  // Always show section even if no scouts (for layout consistency)

  return (
    <div className="w-full bg-white py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
        {/* Desktop: Carousel layout with header */}
        <div className="hidden md:block">
          {/* Fixed header */}
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-semibold">
              <span className="text-black">Top schools across the country are connected with our scouts</span>{' '}
              <span className="mx-2">|</span>{' '}
              <button
                onClick={openSignUp}
                className="text-blue-600 hover:text-blue-800 transition-colors underline font-medium text-lg whitespace-nowrap"
              >
                See all scouts
              </button>
            </h2>
          </div>
          
          {/* Horizontally scrollable vertical cards */}
          <div className="overflow-x-auto scrollbar-hide pb-4">
            <div className="flex gap-6" style={{ width: 'max-content' }}>
              {loading ? (
                <div className="text-center text-gray-400 py-8 min-w-[320px]">
                  <p>Loading scouts...</p>
                </div>
              ) : filteredScouts.length === 0 ? (
                <div className="text-center text-gray-400 py-8 min-w-[320px]">
                  <p>No scouts available yet</p>
                </div>
              ) : (
                filteredScouts.map((scout) => {
                const avatarUrl = isMeaningfulAvatar(scout.avatar_url) ? scout.avatar_url : null
                const collegeConnectionSlugs = parseCollegeConnections(scout.college_connections)
                const collegeLogos = collegeConnectionSlugs
                  .map(slug => collegeEntries.find(c => c.slug === slug))
                  .filter((college): college is typeof collegeEntries[0] => college !== undefined && !!college.logo)

                return (
                  <button
                    key={scout.id}
                    onClick={() => handleScoutClick(scout.id, scout.username)}
                    className="flex-shrink-0 bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow text-left cursor-pointer"
                    style={{ width: '320px' }}
                  >
                    {/* Scout profile image (vertical card) */}
                    <div className="relative w-full aspect-[3/4] bg-gray-100 rounded-t-lg overflow-hidden">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={scout.full_name || 'Scout'}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div
                          className={`w-full h-full flex items-center justify-center text-6xl font-semibold text-white ${getGradientForId(
                            scout.user_id || scout.id || scout.username || scout.full_name || 'profile'
                          )}`}
                        >
                          {scout.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      
                      {/* College logos overlaid on top of profile image */}
                      {collegeLogos.length > 0 && (
                        <div className="absolute inset-0 z-10 flex flex-wrap gap-2 items-start justify-start p-4">
                          {collegeLogos.map((college) => (
                            <div
                              key={college.slug}
                              className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-lg flex-shrink-0"
                            >
                              <Image
                                src={college.logo}
                                alt={college.name}
                                width={32}
                                height={32}
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Scout name below image */}
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-black mb-1">
                        {scout.full_name || scout.username || 'Unknown'}
                      </h3>
                    </div>
                  </button>
                )
                })
              )}
            </div>
          </div>
        </div>

        {/* Mobile: Horizontal scroll with scout images */}
        <div className="md:hidden mb-4">
          {/* Fixed text above images */}
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-600">
              Top schools across the country are connected with our scouts{' '}
              <span className="mx-1">|</span>{' '}
              <button
                onClick={openSignUp}
                className="text-blue-600 hover:text-blue-800 transition-colors underline font-medium"
              >
                See all scouts
              </button>
            </p>
          </div>
          
          {/* Scrollable images */}
          <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-8 sm:-mx-12 lg:-mx-16 px-8 sm:px-12 lg:px-16">
            <div className="flex gap-4" style={{ width: 'max-content' }}>
              {loading ? (
                <div className="text-center text-gray-400 py-8">
                  Loading scouts...
                </div>
              ) : filteredScouts.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No scouts available yet
                </div>
              ) : (
                filteredScouts.map((scout) => {
                const avatarUrl = isMeaningfulAvatar(scout.avatar_url) ? scout.avatar_url : null
                const collegeConnectionSlugs = parseCollegeConnections(scout.college_connections)
                const collegeLogos = collegeConnectionSlugs
                  .map(slug => collegeEntries.find(c => c.slug === slug))
                  .filter((college): college is typeof collegeEntries[0] => college !== undefined && !!college.logo)

                return (
                  <button
                    key={scout.id}
                    onClick={() => handleScoutClick(scout.id, scout.username)}
                    className="relative flex-shrink-0 snap-center w-full cursor-pointer"
                    style={{ width: 'calc(100vw - 4rem)', aspectRatio: '3/4' }}
                  >
                    {/* Scout profile image background */}
                    <div className="relative w-full h-full rounded-lg overflow-hidden">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={scout.full_name || 'Scout'}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div
                          className={`w-full h-full flex items-center justify-center text-6xl font-semibold text-white ${getGradientForId(
                            scout.user_id || scout.id || scout.username || scout.full_name || 'profile'
                          )}`}
                        >
                          {scout.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      
                      {/* College logos overlaid on top of profile image */}
                      {collegeLogos.length > 0 && (
                        <div className="absolute inset-0 z-10 flex flex-wrap gap-2 items-start justify-start p-3">
                          {collegeLogos.map((college) => (
                            <div
                              key={college.slug}
                              className="bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-lg flex-shrink-0"
                            >
                              <Image
                                src={college.logo}
                                alt={college.name}
                                width={28}
                                height={28}
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


