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
  full_name: string
  organization: string | null
  position: string | null
  avatar_url: string | null
  bio?: string | null
  credentials?: string | null
  price_per_eval?: number | null
  stripe_account_id?: string | null
  college_connections?: any
}

interface TopScoutsProps {
  scouts: Scout[]
}

export default function TopScouts({ scouts = [] }: TopScoutsProps) {
  const router = useRouter()
  const { openSignUp } = useAuthModal()
  
  const handleGetStarted = () => {
    // Set flag that user wants to sign up for player/parent flow
    if (typeof window !== 'undefined') {
      localStorage.setItem('playerparent_onboarding', 'true')
      localStorage.removeItem('scout_onboarding') // Clear any stale scout flag
      // Set cookie so middleware can check it server-side
      document.cookie = 'playerparent_onboarding=true; path=/; max-age=3600' // 1 hour
    }
    // Navigate to player/parent onboarding step 1
    router.push('/playerparent?step=1')
  }
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(!!session)
    }
    checkSession()
  }, [])

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

  // Filter scouts: must have stripe_account_id AND price_per_eval !== 99
  const filteredScouts = (Array.isArray(scouts) ? scouts : []).filter(scout => {
    const hasStripe = scout.stripe_account_id !== null && 
                      scout.stripe_account_id !== undefined && 
                      scout.stripe_account_id !== ''
    const hasUniquePrice = scout.price_per_eval !== null && 
                          scout.price_per_eval !== undefined && 
                          scout.price_per_eval !== 99
    return hasStripe && hasUniquePrice
  })

  const handleScoutClick = (scoutId: string, username: string | null | undefined) => {
    if (!hasSession) {
      handleGetStarted()
    } else {
      router.push(getProfilePath(scoutId, username))
    }
  }

  if (filteredScouts.length === 0) {
    return null
  }

  return (
    <div className="w-full bg-white py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-normal text-black">
            Get the results you're looking for
          </h2>
        </div>
        
        {/* Horizontally scrollable cards */}
        <div className="overflow-x-auto scrollbar-hide pb-4">
          <div className="flex gap-6" style={{ width: 'max-content' }}>
            {filteredScouts.map((scout) => {
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
                  {/* Scout image */}
                  <div className="relative w-full aspect-[3/4] bg-gray-100">
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
                    
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    
                    {/* College logos in bottom left */}
                    {collegeLogos.length > 0 && (
                      <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 max-w-[calc(100%-2rem)]">
                        {collegeLogos.slice(0, 6).map((college) => (
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
                        {collegeLogos.length > 6 && (
                          <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1.5 shadow-lg flex items-center justify-center">
                            <span className="text-xs font-semibold text-black">+{collegeLogos.length - 6}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Scout name and price below image */}
                  <div className="p-5">
                    <h3 className="text-xl font-normal text-black mb-1">
                      {scout.full_name || scout.username || 'Unknown'}
                    </h3>
                    {scout.price_per_eval && (
                      <p className="text-lg font-normal text-blue-600">
                        ${scout.price_per_eval}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
