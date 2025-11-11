'use client'

import { useAuthModal } from '@/contexts/AuthModalContext'
import Link from 'next/link'
import Image from 'next/image'
import { colleges } from '@/lib/colleges'

interface WhatsThisContentProps {
  organizations: string[]
  hasSession: boolean
}

const SPORTS = [
  { emoji: '🏈', name: 'Football', value: 'football' },
  { emoji: '🏀', name: 'Basketball', value: 'basketball' },
  { emoji: '⚽', name: 'Soccer', value: 'soccer' },
  { emoji: '⚾', name: 'Baseball', value: 'baseball' },
  { emoji: '🏐', name: 'Volleyball', value: 'volleyball' },
  { emoji: '🎾', name: 'Tennis', value: 'tennis' },
  { emoji: '🏌️', name: 'Golf', value: 'golf' },
  { emoji: '🏃', name: 'Track & Field', value: 'track' },
  { emoji: '🏊', name: 'Swimming', value: 'swimming' },
  { emoji: '🤼', name: 'Wrestling', value: 'wrestling' },
  { emoji: '🏋️', name: 'Weightlifting', value: 'weightlifting' },
  { emoji: '🏑', name: 'Lacrosse', value: 'lacrosse' },
]

export default function WhatsThisContent({ organizations, hasSession }: WhatsThisContentProps) {
  const { openSignIn, openSignUp } = useAuthModal()
  
  // Match organizations to colleges from our list
  const collegeLogos = organizations
    .map(orgName => {
      // Try to find exact match or partial match
      return colleges.find(college => 
        orgName.toLowerCase().includes(college.name.toLowerCase()) ||
        college.name.toLowerCase().includes(orgName.toLowerCase())
      )
    })
    .filter((college): college is NonNullable<typeof college> => college !== undefined)
    // Only show teams that will have good logo coverage (colleges, NFL, NBA)
    .filter(college => 
      college.conference !== 'MLB' && college.conference !== 'NHL'
    )
    // Remove duplicates by name
    .filter((college, index, self) => 
      index === self.findIndex(c => c.name === college.name)
    )

  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="text-center mb-0 pt-8 sm:pt-12 md:pt-16 lg:pt-20 pb-0 px-4 sm:px-6 md:px-8 lg:px-12 bg-gradient-to-b from-gray-50 to-white rounded-xl md:rounded-2xl border-2 border-gray-100 shadow-sm max-w-6xl mx-auto">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-6 sm:mb-8 md:mb-10 leading-tight max-w-4xl mx-auto">
          The marketplace connecting high school athletes with college scouts for HUDL film evaluations.
        </h1>
        {!hasSession && (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6 sm:mb-8">
            <button
              onClick={openSignUp}
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm sm:text-base md:text-lg"
            >
              Sign Up
            </button>
            <button
              onClick={openSignIn}
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 border-2 border-black text-black rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm sm:text-base md:text-lg"
            >
              Sign In
            </button>
          </div>
        )}
        <p className="text-xs sm:text-sm md:text-base text-gray-500 italic mb-6 sm:mb-8 md:mb-10">
          *Must be 16 years or older
        </p>
      </div>

      {/* Sports Section */}
      <div className="my-8 sm:my-12 md:my-16 overflow-hidden w-full">
        <div className="relative w-full">
          <div className="flex animate-scroll w-fit">
            {/* First set of sports */}
            {SPORTS.map((sport) => (
              <div
                key={`first-${sport.value}`}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-full mr-3 sm:mr-4 whitespace-nowrap shrink-0"
              >
                <span className="text-base sm:text-lg">{sport.emoji}</span>
                <span className="text-xs sm:text-sm font-medium text-black">{sport.name}</span>
              </div>
            ))}
            {/* Duplicate set for seamless loop */}
            {SPORTS.map((sport) => (
              <div
                key={`second-${sport.value}`}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-full mr-3 sm:mr-4 whitespace-nowrap shrink-0"
              >
                <span className="text-base sm:text-lg">{sport.emoji}</span>
                <span className="text-xs sm:text-sm font-medium text-black">{sport.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="w-full px-4 sm:px-6 md:px-8 mb-8 sm:mb-12 md:mb-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-12">
            {/* For Players */}
            <div className="w-full bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 border-2 border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-black">For Players</h2>
              </div>
              <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base md:text-lg leading-relaxed">
                Get professional evaluations from verified college scouts. Stand out to recruiters with detailed, personalized feedback on your game film.
              </p>
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm md:text-base text-gray-700">
                <li className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Browse verified college scouts</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Purchase evaluations from top scouts</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Receive detailed 1,000+ character evaluations</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Build your profile with Hudl links and stats</span>
                </li>
              </ul>
            </div>

            {/* For Scouts */}
            <div className="w-full bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 border-2 border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-black">For Scouts</h2>
              </div>
              <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base md:text-lg leading-relaxed">
                Monetize your expertise. Connect with talented players and provide valuable evaluations while building your reputation.
              </p>
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm md:text-base text-gray-700">
                <li className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Apply to become a verified scout</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Set your own pricing and turnaround time</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Earn money by evaluating player film</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Build your professional profile</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Teams/Colleges Section - Circular logo grid */}
      {collegeLogos.length > 0 && (
        <div className="w-full px-4 sm:px-6 md:px-8 mb-8 sm:mb-12 md:mb-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-center text-lg sm:text-xl md:text-2xl font-bold text-black mb-6 sm:mb-8">
              Teams on the Platform
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 md:gap-10">
              {collegeLogos.map((college) => (
                <div
                  key={college.slug}
                  className="group flex flex-col items-center gap-2 transition-transform hover:scale-110 cursor-pointer"
                  title={college.name}
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center bg-white rounded-xl shadow-md border-2 border-gray-200 group-hover:border-blue-600 group-hover:shadow-lg transition-all p-3 sm:p-4 overflow-hidden">
                    <Image
                      src={college.logo}
                      alt={college.name}
                      width={96}
                      height={96}
                      className="object-contain"
                     
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="w-full px-4 sm:px-6 md:px-8 mb-8 sm:mb-12 md:mb-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-black text-center mb-6 sm:mb-8 md:mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 lg:gap-12">
            <div className="bg-gray-50 rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 border border-gray-200">
              <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <span className="text-black text-lg sm:text-xl font-bold">1</span>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-black mb-3 sm:mb-4 text-center">Find Your Match</h3>
              <p className="text-gray-600 text-xs sm:text-sm md:text-base leading-relaxed text-center">
                Players and parents browse verified scouts, view their profiles, and choose the best fit for their evaluation needs.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 border border-gray-200">
              <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <span className="text-black text-lg sm:text-xl font-bold">2</span>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-black mb-3 sm:mb-4 text-center">Get Evaluated</h3>
              <p className="text-gray-600 text-xs sm:text-sm md:text-base leading-relaxed text-center">
                Place your HUDL profile link in your profile, purchase an evaluation, and the scout provides detailed, written feedback within their promised turnaround time.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 border border-gray-200">
              <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <span className="text-black text-lg sm:text-xl font-bold">3</span>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-black mb-3 sm:mb-4 text-center">Elevate Your Game</h3>
              <p className="text-gray-600 text-xs sm:text-sm md:text-base leading-relaxed text-center">
                Use the insights to improve your skills, understand your strengths, and catch the eye of college recruiters.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="w-full px-4 sm:px-6 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 text-center text-white mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 md:mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-6 sm:mb-8 max-w-2xl mx-auto opacity-90 px-2">
              Whether you're a player seeking feedback or a scout looking to share your expertise, Got1 is the place for you.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <Link
                href="/browse"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 border border-transparent text-sm sm:text-base font-medium rounded-md text-purple-600 bg-white hover:bg-gray-100 transition-colors"
              >
                Find a Scout
              </Link>
              <Link
                href="/profile/scout-application"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 border border-white text-sm sm:text-base font-medium rounded-md text-white hover:bg-white hover:text-indigo-600 transition-colors"
              >
                Become a Scout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

