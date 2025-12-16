'use client'

import { useAuthModal } from '@/contexts/AuthModalContext'
import { useRouter } from 'next/navigation'
import WelcomeHero from '@/components/welcome/WelcomeHero'
import TeamLogosBar from '@/components/welcome/TeamLogosBar'
import TopScouts from '@/components/welcome/TopScouts'
import WelcomeFooter from '@/components/welcome/WelcomeFooter'
import Link from 'next/link'
import Image from 'next/image'
import VerificationBadge from '@/components/shared/VerificationBadge'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getProfilePath } from '@/lib/profile-url'
import { collegeEntries } from '@/lib/college-data'
import { useState } from 'react'

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
  scout_category?: 'pro' | 'd1-college' | 'smaller-college' | null
  price_per_eval?: number | null
  suspended_until?: string | null
  stripe_account_id?: string | null
  college_connections?: any
}

interface WelcomeContentProps {
  collegeConnectionSlugs: string[]
  topScouts: Scout[]
  proScouts: Scout[]
  d1Scouts: Scout[]
  d2Scouts: Scout[]
  profileAvatars?: Array<{
    id: string
    avatar_url: string | null
    full_name: string | null
  }>
}

export default function WelcomeContent({ 
  collegeConnectionSlugs,
  topScouts,
  proScouts,
  d1Scouts,
  d2Scouts,
  profileAvatars = [],
}: WelcomeContentProps) {
  const { openSignUp } = useAuthModal()
  const router = useRouter()
  
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
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const findCollegeMatch = (organization: string | null) => {
    if (!organization) return null
    const normalized = organization.toLowerCase().trim()
    const normalizedSimple = normalized.replace(/[^a-z0-9]/g, '')
    
    return (
      collegeEntries.find((college) => college.name.toLowerCase() === normalized) ||
      collegeEntries.find((college) => normalized === college.name.toLowerCase().replace('university of ', '') && college.division === 'FBS') ||
      collegeEntries.find((college) => normalized.includes(college.name.toLowerCase())) ||
      collegeEntries.find((college) => college.name.toLowerCase().includes(normalized)) ||
      collegeEntries.find((college) => normalizedSimple === college.name.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
      collegeEntries.find((college) => normalizedSimple.includes(college.name.toLowerCase().replace(/[^a-z0-9]/g, '')))
    )
  }

  const renderExpertCard = (scout: Scout) => {
    const avatarUrl = isMeaningfulAvatar(scout.avatar_url) ? scout.avatar_url : null
    const jobTitle = scout.position && scout.organization
      ? `${scout.position} at ${scout.organization}`
      : scout.position || scout.organization || 'Football Expert'
    const briefDescription = scout.bio || scout.credentials || ''
    const collegeMatch = scout.organization ? findCollegeMatch(scout.organization) : null

    return (
      <Link
        key={scout.id}
        href={getProfilePath(scout.id, scout.username)}
        className="cursor-pointer bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
      >
        <div className="w-full aspect-square relative overflow-hidden bg-gray-100">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={scout.full_name || 'Profile'}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center text-4xl font-semibold text-white ${getGradientForId(
                scout.user_id || scout.id || scout.username || scout.full_name || 'profile'
              )}`}
            >
              {scout.full_name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-normal text-black text-lg leading-tight">
              {scout.full_name || scout.username || 'Unknown'}
            </h3>
            <VerificationBadge className="flex-shrink-0" />
          </div>

          <p className="text-sm text-gray-600 mb-2 leading-tight">
            {jobTitle}
          </p>

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

          {briefDescription && (
            <p className="text-sm text-gray-700 line-clamp-3 leading-snug">
              {briefDescription}
            </p>
          )}
        </div>
      </Link>
    )
  }

  return (
    <div className="w-full">
      {/* Hero Section with Background Image */}
      <div className="relative">
        <WelcomeHero />
      </div>

      {/* Hero Text Section */}
      <div className="w-full py-12 md:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-8 sm:px-12 lg:px-16 text-center">
          {/* Small text */}
          <p className="text-sm md:text-base text-gray-600 mb-4">
            🎉 For high school football parents and players
          </p>
          
          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-normal text-black mb-4 md:mb-5 leading-tight">
            Recruiting done right
          </h1>
          
          {/* Subtitle */}
          <p className="text-base md:text-lg text-gray-600 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
            Got1 connects high school football players and parents with national college scouts for player evaluations on demand.
          </p>
          
          {/* CTA Button */}
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center justify-center px-8 md:px-10 py-3 md:py-4 rounded-full text-white font-medium hover:opacity-90 active:scale-95 transition-all text-base md:text-lg shadow-lg hover:shadow-xl mb-12 md:mb-16"
            style={{ backgroundColor: '#233dff' }}
          >
            Get Started for Free
          </button>
          
          {/* Scout Profile Pictures */}
          {profileAvatars.length > 0 && (
            <div className="flex justify-center items-center mb-4">
              {profileAvatars.slice(0, 5).map((profile, index) => {
                const avatarUrl = profile.avatar_url
                const hasValidAvatar = avatarUrl && isMeaningfulAvatar(avatarUrl) && !imageErrors.has(profile.id)
                
                return (
                  <div
                    key={profile.id}
                    className="relative rounded-full border-2 border-white overflow-hidden flex-shrink-0"
                    style={{
                      marginLeft: index > 0 ? '-8px' : '0',
                      zIndex: 5 - index,
                      width: '48px',
                      height: '48px',
                    }}
                  >
                    {hasValidAvatar ? (
                      <Image
                        src={avatarUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="w-full h-full object-cover rounded-full"
                        unoptimized
                        onError={() => {
                          setImageErrors(prev => new Set(prev).add(profile.id))
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-full">
                        <span className="text-gray-600 text-sm font-semibold">
                          {profile.full_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          
          {/* 5 Stars */}
          <div className="flex justify-center items-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className="w-5 h-5 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          
          {/* Trust text */}
          <p className="text-sm md:text-base text-gray-600">
            Trusted by parents across the country.
          </p>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="w-full py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="relative pl-8 md:pl-12">
              <div className="absolute left-0 top-0 w-1 h-full bg-gray-300 rounded-full"></div>
              <h3 className="text-xl md:text-2xl font-normal text-black mb-4 leading-tight">
                Connect with verified scouts
              </h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                Browse verified college scouts and get professional feedback on your game film.
              </p>
            </div>
            <div className="relative pl-8 md:pl-12">
              <div className="absolute left-0 top-0 w-1 h-full bg-gray-300 rounded-full"></div>
              <h3 className="text-xl md:text-2xl font-normal text-black mb-4 leading-tight">
                Advance your recruiting journey
              </h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                Take actionable feedback, connect with scouts on X, and build your network for the right university
              </p>
            </div>
            <div className="relative pl-8 md:pl-12">
              <div className="absolute left-0 top-0 w-1 h-full bg-gray-300 rounded-full"></div>
              <h3 className="text-xl md:text-2xl font-normal text-black mb-4 leading-tight">
                Quality evaluation, guaranteed
              </h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                Our guarantee — get valuable feedback from your evaluation or your money back
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Logos Bar - Always show */}
      <TeamLogosBar collegeConnectionSlugs={collegeConnectionSlugs || []} />

      {/* Top 3 Scouts - Always show this section */}
      <TopScouts scouts={topScouts || []} />

      {/* Pro Section */}
      {proScouts.length > 0 && (
        <div className="w-full py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl md:text-4xl font-normal text-black">Pro</h2>
              <Link 
                href="/discover?category=pro" 
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {proScouts.slice(0, 6).map(renderExpertCard)}
            </div>
          </div>
        </div>
      )}

      {/* D1 College Section */}
      {d1Scouts.length > 0 && (
        <div className="w-full py-16 bg-white">
          <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl md:text-4xl font-normal text-black">D1 College</h2>
              <Link 
                href="/discover?category=d1-college" 
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {d1Scouts.slice(0, 6).map(renderExpertCard)}
            </div>
          </div>
        </div>
      )}

      {/* D2/Smaller College Section */}
      {d2Scouts.length > 0 && (
        <div className="w-full py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl md:text-4xl font-normal text-black">Smaller College</h2>
              <Link 
                href="/discover?category=smaller-college" 
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {d2Scouts.slice(0, 6).map(renderExpertCard)}
            </div>
          </div>
        </div>
      )}

      {/* Final CTA */}
      <div className="w-full py-12 md:py-16 pb-24 md:pb-32 bg-white">
        <div className="max-w-4xl mx-auto px-8 sm:px-12 lg:px-16 text-center">
          <h2 className="text-2xl md:text-3xl font-normal text-black mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-base md:text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Join Got1 today and connect with verified college scouts who can help take your recruiting to the next level.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center justify-center px-8 py-3 rounded-full text-white font-medium hover:opacity-90 transition-opacity text-base md:text-lg shadow-lg"
            style={{ backgroundColor: '#233dff' }}
          >
            Get Started for Free
          </button>
        </div>
      </div>

      {/* Footer */}
      <WelcomeFooter />
    </div>
  )
}


