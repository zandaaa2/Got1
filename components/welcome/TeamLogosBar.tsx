'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { collegeEntries } from '@/lib/college-data'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { createClient } from '@/lib/supabase-client'

interface TeamLogosBarProps {
  collegeConnectionSlugs?: string[]
}

export default function TeamLogosBar({ collegeConnectionSlugs = [] }: TeamLogosBarProps) {
  const { openSignUp } = useAuthModal()
  const router = useRouter()
  const [hasSession, setHasSession] = useState(false)
  
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

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(!!session)
    }
    checkSession()
  }, [])

  const handleSchoolClick = (schoolSlug: string) => {
    if (!hasSession) {
      openSignUp()
    } else {
      // Navigate to discover page filtered by school
      router.push(`/discover?school=${schoolSlug}`)
    }
  }

  // Fixed list of 5 specific colleges: Michigan, Auburn, Miami, Mississippi State, Arizona
  const specificCollegeSlugs = [
    'university-of-michigan', // Michigan
    'auburn-university', // Auburn
    'miami-florida', // Miami
    'mississippi-state-university', // Mississippi State
    'arizona', // Arizona
  ]
  
  // Find colleges by slug
  const teamLogos = specificCollegeSlugs
    .map(slug => {
      const college = collegeEntries.find(c => c.slug === slug)
      return college ? { name: college.name, logo: college.logo, slug: college.slug } : null
    })
    .filter((team): team is { name: string; logo: string; slug: string } => 
      team !== null && team.logo !== undefined
    )

  // Map slugs to image filenames
  const getTeamImage = (slug: string) => {
    const imageMap: Record<string, string> = {
      'university-of-michigan': '/landingpage/michigan.jpg',
      'auburn-university': '/landingpage/auburn.jpg',
      'miami-florida': '/landingpage/miami.jpg',
      'mississippi-state-university': '/landingpage/mississippi state.jpg',
      'arizona': '/landingpage/arizona.jpg',
    }
    return imageMap[slug] || ''
  }

  return (
    <div className="w-full bg-white py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
        {/* Desktop: Carousel layout with header */}
        <div className="hidden md:block">
          {/* Fixed header */}
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl">
              <span className="text-black font-normal">Our scouts</span>{' '}
              <span className="text-gray-400 font-normal">have connections with these schools.</span>
            </h2>
            <button
              onClick={handleGetStarted}
              className="text-blue-600 hover:text-blue-800 transition-colors underline font-medium text-lg whitespace-nowrap"
            >
              See all schools
            </button>
          </div>
          
          {/* Horizontally scrollable cards */}
          <div className="overflow-x-auto scrollbar-hide pb-4">
            <div className="flex gap-6" style={{ width: 'max-content' }}>
              {teamLogos.map((team) => {
                const teamImage = getTeamImage(team.slug)
                return (
                  <button
                    key={team.slug}
                    onClick={() => handleSchoolClick(team.slug)}
                    className="flex-shrink-0 bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow text-left cursor-pointer"
                    style={{ width: '320px' }}
                  >
                    {/* Team image */}
                    <div className="relative w-full aspect-[3/4] bg-gray-100">
                      <Image
                        src={teamImage}
                        alt={team.name}
                        fill
                        className="object-cover"
                        loading="lazy"
                      />
                      
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      
                      {/* School logo in bottom left */}
                      <div className="absolute bottom-4 left-4 z-10">
                        <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                          <Image
                            src={team.logo}
                            alt={team.name}
                            width={48}
                            height={48}
                            className="object-contain"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* School name below image */}
                    <div className="p-5">
                      <h3 className="text-xl font-normal text-black mb-1">
                        {team.name}
                      </h3>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mobile: Horizontal scroll with team images */}
        <div className="md:hidden mb-4">
          {/* Fixed header - matches evaluations section styling */}
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl md:text-3xl">
              <span className="text-black font-normal">Our scouts</span>{' '}
              <span className="text-gray-400 font-normal">have connections with these schools.</span>
            </h2>
          </div>
          
          {/* Scrollable images */}
          <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-8 sm:-mx-12 lg:-mx-16 px-8 sm:px-12 lg:px-16">
            <div className="flex gap-4" style={{ width: 'max-content' }}>
              {teamLogos.map((team) => {
                const teamImage = getTeamImage(team.slug)
                return (
                  <button
                    key={team.slug}
                    onClick={() => handleSchoolClick(team.slug)}
                    className="relative flex-shrink-0 snap-center w-full cursor-pointer"
                    style={{ width: 'calc(100vw - 4rem)', aspectRatio: '3/4' }}
                  >
                    {/* Team image background */}
                    <div className="relative w-full h-full rounded-lg overflow-hidden">
                      <Image
                        src={teamImage}
                        alt={team.name}
                        fill
                        className="object-cover"
                        loading="lazy"
                      />
                      
                      {/* Gradient overlay for logo readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      
                      {/* School logo in bottom left */}
                      <div className="absolute bottom-4 left-4 z-10">
                        <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                          <Image
                            src={team.logo}
                            alt={team.name}
                            width={40}
                            height={40}
                            className="object-contain"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
