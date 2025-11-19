'use client'

import { useAuthModal } from '@/contexts/AuthModalContext'
import Link from 'next/link'
import Image from 'next/image'
import { getGradientForId } from '@/lib/gradients'

interface WhatsThisContentProps {
  organizations: string[]
  hasSession: boolean
  profileAvatars: Array<{
    id: string
    avatar_url: string | null
    full_name: string | null
  }>
}

export default function WhatsThisContent({ organizations, hasSession, profileAvatars }: WhatsThisContentProps) {
  const { openSignIn, openSignUp } = useAuthModal()

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
      {/* Hero Section */}
      <div className="mt-8 md:mt-12 mb-12 md:mb-16 text-center">
        <p className="text-sm text-gray-500 -mb-1">
          🎉 For high school football players and college evaluators.
        </p>
        <div className="pt-4 md:pt-6 pb-8 bg-white rounded-2xl w-full">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-6 md:mb-8 leading-tight max-w-3xl mx-auto px-4">
            Guarantee your film gets watched.
          </h1>
          <p className="text-base md:text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto mb-6 md:mb-8 px-4">
            Got1 connects high school football players with verified scouts. Players get detailed feedback on their game film, and scouts monetize their expertise by evaluating talent. Get seen. Get paid.
          </p>
          {!hasSession && (
            <div className="flex justify-center items-center mb-6">
              <button
                onClick={openSignUp}
                className="interactive-press inline-flex items-center justify-center px-8 py-3 rounded-full text-white font-semibold hover:opacity-90 transition-opacity text-base md:text-lg"
                style={{ backgroundColor: '#233dff' }}
              >
                Get Started for Free
              </button>
            </div>
          )}

          {/* Trust Section */}
          {profileAvatars.length > 0 && (
            <div className="flex flex-col items-center gap-3 pt-6">
              <div className="flex items-center justify-center -space-x-3">
                {profileAvatars.slice(0, 5).map((profile) => (
                  <div
                    key={profile.id}
                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-white flex-shrink-0"
                  >
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.full_name || 'Profile'}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-white text-xs font-semibold ${getGradientForId(profile.id)}`}>
                        {profile.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-yellow-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-gray-600">
                Trusted by coaches and players across the country.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="mb-12 md:mb-16 bg-gray-50 rounded-2xl p-6 md:p-8">
        <div className="space-y-4">
          {/* Feature 1 */}
          <div className="bg-white rounded-xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-black text-lg mb-2">Verified Scouts</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Connect with verified college scouts and evaluators who are actively recruiting talent.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-black text-lg mb-2">Detailed Feedback</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Receive comprehensive written evaluations that break down your performance and highlight your strengths.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-black text-lg mb-2">Fast Turnaround</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Get your evaluations back quickly with scouts offering fast turnaround times on their reviews.
              </p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-black text-lg mb-2">Secure Payments</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                All transactions are processed securely through Stripe with encrypted payment processing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* For Players & Scouts */}
      <div className="mb-12 md:mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* For Players */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-black">For Players</h2>
            </div>
            <ul className="space-y-4 text-gray-700">
              <li className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Browse verified college scouts</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Purchase professional evaluations</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Receive detailed written feedback</span>
              </li>
            </ul>
          </div>

          {/* For Scouts */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-black">For Scouts</h2>
            </div>
            <ul className="space-y-4 text-gray-700">
              <li className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Apply to become verified</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Set your pricing and turnaround</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Earn money evaluating film</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mb-8">
        <div className="bg-gray-50 rounded-2xl p-8 md:p-12 border border-gray-200 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-base text-gray-600 mb-8 max-w-xl mx-auto">
            Whether you're a player seeking feedback or a scout looking to share your expertise, Got1 is the place for you.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/browse"
              className="inline-flex items-center justify-center px-8 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-base"
            >
              Find a Scout
            </Link>
            <Link
              href="/profile/scout-application"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-black text-black rounded-lg font-medium hover:bg-gray-50 transition-colors text-base"
            >
              Become a Scout
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

