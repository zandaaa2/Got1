'use client'

import { useState } from 'react'
import { useAuthModal } from '@/contexts/AuthModalContext'
import Link from 'next/link'
import ContactCollegeModal from './ContactCollegeModal'

interface WhatsThisContentProps {
  organizations: string[]
  hasSession: boolean
}

interface FAQItemProps {
  question: string
  answer: string
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 text-left flex items-center justify-between hover:text-gray-700 transition-colors"
      >
        <span className="font-medium text-black pr-4">{question}</span>
        <svg
          className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="pb-4">
          <p className="text-sm text-gray-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

export default function WhatsThisContent({ organizations, hasSession }: WhatsThisContentProps) {
  const { openSignIn, openSignUp } = useAuthModal()
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)

  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="mb-8 sm:mb-12 md:mb-16">
        <div className="relative text-center pt-8 sm:pt-12 md:pt-16 lg:pt-20 pb-0 bg-white rounded-xl md:rounded-2xl border border-gray-200 w-full">
          {/* Sports Tag - Top Right on desktop, pushes content on mobile */}
          <div className="relative sm:absolute top-0 sm:top-6 right-auto sm:right-6 flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-1.5 bg-white border border-gray-200 rounded-full mb-4 sm:mb-0 mx-auto sm:mx-0 w-fit">
            <span className="text-xs sm:text-sm text-gray-500">Just</span>
            <span className="text-sm sm:text-base">🏈</span>
            <span className="text-sm sm:text-base">🏀</span>
            <span className="text-xs sm:text-sm text-gray-500">For now...</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-6 sm:mb-8 md:mb-10 leading-tight max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
            Get your high school tape in front of any college scout from any team.
          </h1>
          {!hasSession && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6 sm:mb-8 px-4 sm:px-6 md:px-8">
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
          <p className="text-xs sm:text-sm md:text-base text-gray-500 italic mb-6 sm:mb-8 md:mb-10 px-4 sm:px-6 md:px-8">
            *Must be 16 years or older
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="mb-8 md:mb-12">
        <h2 className="text-lg md:text-xl font-bold text-black mb-4 md:mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 md:w-6 md:h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Benefits
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* For Players */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-black">For Players</h2>
              </div>
              <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                Get professional evaluations from verified college football scouts. Stand out to recruiters with detailed, personalized feedback on your football film.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Browse verified college scouts</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Purchase evaluations from top scouts</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Receive detailed 1,000+ character evaluations</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Build your profile with Hudl links and stats</span>
                </li>
              </ul>
            </div>

          {/* For Scouts */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-black">For Scouts</h2>
            </div>
            <p className="text-gray-700 mb-4 text-sm leading-relaxed">
              Monetize your expertise. Connect with talented football players and provide valuable evaluations while building your reputation.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Apply to become a verified scout</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Set your own pricing and turnaround time</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Earn money by evaluating football film</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Build your professional profile</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-8 md:mb-12">
        <h2 className="text-lg md:text-xl font-bold text-black mb-4 md:mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 md:w-6 md:h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <span className="text-black text-lg font-bold">1</span>
            </div>
            <h3 className="text-base font-bold text-black mb-3">Find Your Match</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Football players and parents browse verified scouts, view their profiles, and choose the best fit for their evaluation needs.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <span className="text-black text-lg font-bold">2</span>
            </div>
            <h3 className="text-base font-bold text-black mb-3">Get Evaluated</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Place your HUDL football profile link in your profile, purchase an evaluation, and the scout provides detailed, written feedback on your football film within their promised turnaround time.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <span className="text-black text-lg font-bold">3</span>
            </div>
            <h3 className="text-base font-bold text-black mb-3">Elevate Your Game</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Use the insights to improve your football skills, understand your strengths, and catch the eye of college football recruiters.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mb-8 md:mb-12">
        <h2 className="text-lg md:text-xl font-bold text-black mb-4 md:mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 md:w-6 md:h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          FAQ for players, parents, and scouts
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 px-4 sm:px-6">
          <FAQItem
            question="How does the evaluation process work?"
            answer="Players browse verified scouts, purchase an evaluation, and provide their HUDL profile link. Scouts then review the film and provide detailed written feedback within their promised turnaround time."
          />
          <FAQItem
            question="How much do evaluations cost?"
            answer="Pricing varies by scout. Each scout sets their own price, typically around $99, but you can see individual pricing on each scout's profile."
          />
          <FAQItem
            question="How long does an evaluation take?"
            answer="Turnaround time varies by scout and is displayed on their profile. Scouts set their own timeline, typically ranging from a few days to a week."
          />
          <FAQItem
            question="How do I become a verified scout?"
            answer="Apply through our scout application process. You'll need to provide your work history, current position, and additional information. Our team reviews applications and approves qualified scouts."
          />
          <FAQItem
            question="What sports are currently supported?"
            answer="Currently, we support football and basketball evaluations. We're working on expanding to additional sports in the future."
          />
          <FAQItem
            question="Is there an age requirement?"
            answer="Yes, you must be at least 16 years old to use the platform."
          />
        </div>
      </div>

      {/* College Section */}
      <div className="mb-8 md:mb-12">
        <h2 className="text-lg md:text-xl font-bold text-black mb-4 md:mb-6 flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          For Colleges
        </h2>
        <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 rounded-xl p-6 md:p-8 border-2 border-blue-300 shadow-lg">
          <div className="mb-6">
            <p className="text-base md:text-lg text-gray-800 mb-2 font-semibold">
              Partner with Got1 for NIL Opportunities
            </p>
            <p className="text-sm md:text-base text-gray-700 leading-relaxed">
              Are you an administrator at a college or university? We'd love to hear from you. Send us an email with any questions about how Got1 can work with your institution for NIL opportunities.
            </p>
          </div>
          <div className="mb-8">
            <button
              onClick={() => setIsContactModalOpen(true)}
              className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg transform hover:scale-105 text-sm md:text-base"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Us
            </button>
          </div>
          
          <div className="bg-white rounded-lg border-2 border-blue-200 shadow-md px-4 sm:px-6 overflow-hidden">
            <FAQItem
              question="Name and Licensing"
              answer="We want to partner with your university for a new form of NIL Generation. Our platform provides a compliant way for your coaching staff and athletic department personnel to generate NIL opportunities while maintaining full transparency and adherence to NCAA guidelines. We work directly with your compliance office to ensure all partnerships meet institutional and regulatory standards."
            />
            <FAQItem
              question="Recruiting Time Availability"
              answer="We are installing guidelines in place to make sure recruiting time works out to protect you. Our system includes built-in time tracking and compliance features that ensure all evaluation activities occur outside of restricted recruiting periods. We provide detailed reporting to your compliance team and can customize schedules to align with your specific recruiting calendar and institutional policies."
            />
            <FAQItem
              question="Conflict of Interest"
              answer="This is an arm of the university. They still stay employed with the university earning you NIL Money. Our platform is designed to operate as an extension of your athletic department, ensuring that all NIL revenue generated through evaluations flows back to support your programs. Staff members remain university employees, and all activities are conducted under your oversight and approval, maintaining clear separation from any potential conflicts while maximizing NIL opportunities for your institution."
            />
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gray-50 rounded-lg p-6 md:p-8 border border-gray-200">
        <h2 className="text-lg md:text-xl font-bold text-black mb-3 text-center">
          Ready to Get Started?
        </h2>
        <p className="text-sm md:text-base mb-6 max-w-2xl mx-auto text-gray-600 text-center">
          Whether you're a football player seeking feedback or a scout looking to share your expertise, Got1 is the place for you.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/browse"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm md:text-base"
          >
            Find a Scout
          </Link>
          <Link
            href="/profile/scout-application"
            className="inline-flex items-center justify-center px-6 py-2.5 border border-black text-black rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm md:text-base"
          >
            Become a Scout
          </Link>
        </div>
      </div>

      <ContactCollegeModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  )
}

