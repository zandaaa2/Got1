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
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

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

interface Evaluation {
  id: string
  notes: string
  completed_at: string | null
  scout_id: string
  player_id: string
  scout: {
    id: string
    user_id: string | null
    username: string | null
    full_name: string | null
    avatar_url: string | null
    organization: string | null
    position: string | null
  } | null
  player: {
    id: string
    user_id: string | null
    username: string | null
    full_name: string | null
    avatar_url: string | null
    school: string | null
    position: string | null
    graduation_year: number | null
  } | null
}

interface BlogPost {
  id?: string
  slug: string
  title: string
  excerpt: string
  image: string
  author: string
  publishedAt: string
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
  exampleEvaluations?: Evaluation[]
  blogPosts?: BlogPost[]
}

export default function WelcomeContent({ 
  collegeConnectionSlugs,
  topScouts,
  proScouts,
  d1Scouts,
  d2Scouts,
  profileAvatars = [],
  exampleEvaluations = [],
  blogPosts = [],
}: WelcomeContentProps) {
  const { openSignUp } = useAuthModal()
  const router = useRouter()
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(!!session)
    }
    checkSession()
  }, [])

  const handleEvaluationClick = (evaluationId: string) => {
    if (!hasSession) {
      openSignUp()
    } else {
      router.push(`/evaluations/${evaluationId}`)
    }
  }
  
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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

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
              loading="lazy"
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
                    loading="lazy"
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
    <>
      <main className="w-full">
        {/* Hero Section with Background Image */}
        <section className="relative" aria-label="Hero section">
          <WelcomeHero />
        </section>

        {/* Hero Text Section */}
        <section className="w-full py-12 md:py-16 bg-white" aria-label="Introduction">
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
                        alt={profile.full_name || 'User profile'}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover rounded-full"
                        loading="lazy"
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
        </section>

      {/* How It Works Section */}
      <section className="w-full py-20 md:py-28 bg-white" aria-label="How it works">
        <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="relative pl-8 md:pl-12">
              <div className="absolute left-0 top-0 w-1 h-full bg-gray-300 rounded-full"></div>
              <h3 className="text-xl md:text-2xl font-normal text-black mb-4 leading-tight">
                Connect with verified scouts
              </h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                <Link href="/browse" className="text-blue-600 hover:text-blue-700 underline">Browse verified college scouts</Link> and get professional feedback on your game film.
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
      </section>

      {/* Example Evaluations Section */}
      {exampleEvaluations.length > 0 && (
        <section className="w-full py-16 bg-gray-50" aria-label="Example evaluations">
          <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-lg sm:text-xl md:text-3xl">
                <span className="text-black font-normal">Our evaluations</span>{' '}
                <span className="text-gray-400 font-normal">look something like this</span>
              </h2>
            </div>

            {/* Evaluation Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exampleEvaluations.slice(0, 3).map((evaluation) => {
                const scout = evaluation.scout
                const player = evaluation.player
                const scoutAvatarUrl = scout?.avatar_url && isMeaningfulAvatar(scout.avatar_url) 
                  ? scout.avatar_url 
                  : null
                const playerAvatarUrl = player?.avatar_url && isMeaningfulAvatar(player.avatar_url)
                  ? player.avatar_url
                  : null

                // Truncate notes to 5-6 lines (approximately 300 characters)
                const truncatedNotes = evaluation.notes.length > 300
                  ? evaluation.notes.substring(0, 300) + '...'
                  : evaluation.notes

                // Split into lines for display (approximately 5-6 lines)
                const lines = truncatedNotes.split('\n').slice(0, 6)
                const displayText = lines.join('\n')

                return (
                  <button
                    key={evaluation.id}
                    onClick={() => handleEvaluationClick(evaluation.id)}
                    className="w-full text-left bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    {/* Scout and Player Header */}
                    <div className="flex items-center gap-3 mb-4">
                      {/* Scout */}
                      {scout && (
                        <>
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                            {scoutAvatarUrl ? (
                              <Image
                                src={scoutAvatarUrl}
                                alt={scout.full_name || 'Scout'}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${getGradientForId(scout.id || 'scout')}`}>
                                <span className="text-white text-sm font-semibold">
                                  {scout.full_name?.charAt(0).toUpperCase() || 'S'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-black truncate">
                              {scout.full_name || 'Scout'}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {scout.organization || scout.position || ''}
                            </p>
                          </div>
                        </>
                      )}

                      {/* Arrow */}
                      <div className="text-gray-400 flex-shrink-0">→</div>

                      {/* Player */}
                      {player && (
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                          {playerAvatarUrl ? (
                            <Image
                              src={playerAvatarUrl}
                              alt={player.full_name || 'Player'}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${getGradientForId(player.id || 'player')}`}>
                              <span className="text-white text-sm font-semibold">
                                {player.full_name?.charAt(0).toUpperCase() || 'P'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Evaluation Notes Preview (5-6 lines) */}
                    <div className="mb-4">
                      <p className="text-gray-900 whitespace-pre-wrap break-words text-sm leading-relaxed line-clamp-6">
                        {displayText}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Account Types Section */}
      <section className="w-full py-16 md:py-20 bg-white" aria-label="Account types">
        <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-lg sm:text-xl md:text-3xl">
              <span className="text-black font-normal">Your role</span>{' '}
              <span className="text-gray-400 font-normal">tailored to your experience</span>
            </h2>
          </div>

          {/* Account Type Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Player Account */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 md:p-8 hover:shadow-md transition-shadow">
              <div className="mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-normal text-black mb-2">Player</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  High school athletes looking to get evaluated by verified college scouts. Submit your game film, receive professional feedback, and advance your recruiting journey.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Submit game film for evaluation</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Get professional feedback from verified scouts</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Build your recruiting profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Connect with scouts on X (formerly Twitter)</span>
                </li>
              </ul>
            </div>

            {/* Parent Account */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 md:p-8 hover:shadow-md transition-shadow">
              <div className="mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-normal text-black mb-2">Parent</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Parents managing their child's recruiting journey. Create and manage player profiles, submit evaluations, and track progress all in one place.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Manage multiple player profiles</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Submit evaluations on behalf of your athlete</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Track evaluation progress and feedback</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Tag existing player profiles</span>
                </li>
              </ul>
            </div>

            {/* Scout Account */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 md:p-8 hover:shadow-md transition-shadow">
              <div className="mb-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-xl font-normal text-black mb-2">Scout</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Verified college scouts and coaches providing professional evaluations. Build your reputation, connect with athletes, and monetize your expertise.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Provide professional evaluations</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Set your own pricing for evaluations</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Write blog posts and share insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Build your professional network</span>
                </li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center justify-center px-8 py-3 rounded-full text-white font-medium hover:opacity-90 transition-opacity text-base md:text-lg shadow-lg"
              style={{ backgroundColor: '#233dff' }}
            >
              Get Started for Free
            </button>
          </div>
        </div>
      </section>

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

      {/* FAQ Section */}
      <section className="w-full py-16 md:py-20 bg-white" aria-label="Frequently asked questions">
        <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
          <div className="mb-8">
            <h2 className="text-lg sm:text-xl md:text-3xl">
              <span className="text-black font-normal">Questions</span>{' '}
              <span className="text-gray-400 font-normal">written just for you.</span>
            </h2>
          </div>

          <div className="space-y-4 mb-10">
            {/* FAQ Item 1 */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === 0 ? null : 0)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 pr-4 flex-1">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-base sm:text-lg font-normal text-black">
                    What is Got1?
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${
                    openFaqIndex === 0 ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaqIndex === 0 && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">
                    Got1 is a college sports recruiting platform that connects high school athletes with verified college scouts. You can submit your game film for professional evaluations and receive actionable feedback to advance your recruiting. Our network includes scouts from top programs like Michigan, Auburn, and more.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 2 */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === 1 ? null : 1)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 pr-4 flex-1">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-base sm:text-lg font-normal text-black">
                    How do I get scout feedback on my game film?
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${
                    openFaqIndex === 1 ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaqIndex === 1 && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">
                    Sign up as an athlete, create your profile, and submit your highlights or full game film. Verified scouts will review it and provide detailed, professional evaluations with strengths, areas for improvement, and recruiting potential. We guarantee valuable feedback or your money back.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 3 */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === 2 ? null : 2)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 pr-4 flex-1">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-base sm:text-lg font-normal text-black">
                    Are the scouts on Got1 verified and real college coaches?
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${
                    openFaqIndex === 2 ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaqIndex === 2 && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">
                    Yes — every scout on Got1 is verified to ensure they're actively involved in college recruiting. We connect you with scouts from Power 5 and other programs, giving you authentic insights you can trust.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 4 */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === 3 ? null : 3)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 pr-4 flex-1">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-base sm:text-lg font-normal text-black">
                    Is Got1 free to use?
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${
                    openFaqIndex === 3 ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaqIndex === 3 && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">
                    Creating an athlete or scout profile and browsing is free. Submitting film for evaluations may involve a fee, but we offer a quality guarantee: If the feedback isn't valuable, you get your money back.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 5 */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === 4 ? null : 4)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 pr-4 flex-1">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <h3 className="text-base sm:text-lg font-normal text-black">
                    How does Got1 help with college recruiting?
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${
                    openFaqIndex === 4 ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaqIndex === 4 && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">
                    Beyond evaluations, you can connect with scouts on X (formerly Twitter), build your network, and take actionable steps toward the right university. Many athletes use our feedback to improve their highlights and get noticed by college programs.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 6 */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === 5 ? null : 5)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 pr-4 flex-1">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2a15.3 15.3 0 0 1 4.1 2.2c1.1.7 2.1 1.5 3 2.4a15.3 15.3 0 0 1 2.2 4.1M12 22a15.3 15.3 0 0 1-4.1-2.2c-1.1-.7-2.1-1.5-3-2.4a15.3 15.3 0 0 1-2.2-4.1M2 12h20M12 2v20" />
                  </svg>
                  <h3 className="text-base sm:text-lg font-normal text-black">
                    What sports does Got1 support?
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${
                    openFaqIndex === 5 ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaqIndex === 5 && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">
                    We focus primarily on football, with verified scouts evaluating positions like QB, WR, and more. We're expanding to other sports — contact us if you're in another discipline!
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 7 */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === 6 ? null : 6)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 pr-4 flex-1">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h3 className="text-base sm:text-lg font-normal text-black">
                    How private is my information on Got1?
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${
                    openFaqIndex === 6 ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaqIndex === 6 && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">
                    Your full profile, film, and evaluations are private and only visible to verified scouts unless you choose otherwise. We prioritize privacy while helping you get exposure.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center pt-4">
            <Link
              href="/faq"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-gray-200 text-black font-medium hover:bg-gray-300 transition-colors text-base md:text-lg"
            >
              View FAQ page
            </Link>
          </div>
        </div>
      </section>

      {/* Blog/Resources Section */}
      <section className="w-full py-16 md:py-20 bg-white" aria-label="Recruiting resources and blog">
        <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-lg sm:text-xl md:text-3xl">
              <span className="text-black font-normal">Our blog</span>{' '}
              <span className="text-gray-400 font-normal">written just for you.</span>
            </h2>
          </div>

          {/* Blog Posts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.length > 0 ? blogPosts.map((post) => (
              <article key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow text-left flex flex-col"
                >
                {/* Blog Post Image */}
                <div className="relative w-full aspect-video bg-gray-100">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover"
                    loading="lazy"
                  />
                </div>
                {/* Blog Post Content */}
                <div className="p-6 flex-1">
                  <h3 className="text-lg font-semibold text-black mb-3 hover:text-blue-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>
                </Link>
              </article>
            )) : (
              // Fallback to placeholder if no blog posts
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden text-left flex flex-col"
                >
                  <div className="relative w-full aspect-video bg-gray-100">
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="p-6 flex-1">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* CTA Section */}
          <div className="text-center pt-4">
            <Link
              href="/blog"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-gray-200 text-black font-medium hover:bg-gray-300 transition-colors text-base md:text-lg"
            >
              View blog
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full py-20 md:py-28 pb-24 md:pb-32 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" aria-label="Call to action">
        <div className="max-w-4xl mx-auto px-8 sm:px-12 lg:px-16 text-center">
          <h2 className="text-3xl md:text-5xl font-normal text-black mb-6 leading-tight">
            Ready to Get Started?
          </h2>
          <p className="text-lg md:text-xl text-gray-700 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join Got1 today and connect with verified college scouts who can help take your recruiting to the next level.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center justify-center px-10 py-4 rounded-full text-white font-semibold hover:opacity-90 transition-all text-lg md:text-xl shadow-2xl transform hover:scale-105"
            style={{ backgroundColor: '#233dff' }}
          >
            Get Started for Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <WelcomeFooter />
      </main>
    </>
  )
}


