'use client'

import { useAuthModal } from '@/contexts/AuthModalContext'
import Link from 'next/link'

interface WhatsThisContentProps {
  organizations: string[]
  hasSession: boolean
}

export default function WhatsThisContent({ organizations, hasSession }: WhatsThisContentProps) {
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

