'use client'

interface Step1InformationProps {
  onNext: () => void
}

export default function Step1Information({ onNext }: Step1InformationProps) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
          Become a Scout on Got1
        </h1>
        <p className="text-lg text-gray-600">
          Join our network of verified scouts and help athletes get discovered
        </p>
      </div>

      <div className="space-y-8 mb-10">
        {/* What is a Scout */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-black mb-3">What is a Scout?</h2>
          <p className="text-gray-700 leading-relaxed">
            Scouts on Got1 are verified college recruiters, player personnel staff, and talent evaluators 
            who provide professional film evaluations to high school athletes. As a scout, you'll help 
            players understand their strengths, areas for improvement, and potential at the next level.
          </p>
        </div>

        {/* Benefits */}
        <div>
          <h2 className="text-xl font-bold text-black mb-4">Benefits of Being a Scout</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-black">Earn Money</h3>
              </div>
              <p className="text-sm text-gray-600">
                Set your own pricing and get paid for each evaluation you complete. Payments are processed 
                securely through Stripe.
              </p>
            </div>

            <div className="p-5 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-black">Verified Status</h3>
              </div>
              <p className="text-sm text-gray-600">
                Get verified as a legitimate scout with your organization and position credentials. 
                Players trust verified scouts more.
              </p>
            </div>

            <div className="p-5 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-black">Build Your Network</h3>
              </div>
              <p className="text-sm text-gray-600">
                Connect with talented athletes and help them on their recruiting journey. Build relationships 
                that last beyond evaluations.
              </p>
            </div>

            <div className="p-5 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-black">Flexible Schedule</h3>
              </div>
              <p className="text-sm text-gray-600">
                Work on your own time. Set your turnaround time and complete evaluations when it works 
                for your schedule.
              </p>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h2 className="text-xl font-bold text-black mb-3">Requirements</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Current employment or affiliation with a college, university, or professional organization</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Relevant experience in player personnel, recruiting, or talent evaluation</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Professional verification through our application process</span>
            </li>
          </ul>
        </div>

        {/* How It Works */}
        <div>
          <h2 className="text-xl font-bold text-black mb-4">How It Works</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-black mb-1">Complete Your Application</h3>
                <p className="text-gray-600 text-sm">
                  Provide information about your current role, workplace, and experience. Our team will review 
                  your application.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-black mb-1">Get Approved</h3>
                <p className="text-gray-600 text-sm">
                  Once approved, you'll receive access to set up your scout profile, pricing, and start 
                  receiving evaluation requests.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-black mb-1">Start Evaluating</h3>
                <p className="text-gray-600 text-sm">
                  Players will request evaluations from you. Review their film, provide detailed feedback, 
                  and get paid for your work.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="text-center pt-6 border-t border-gray-200">
        <button
          onClick={onNext}
          className="inline-flex items-center justify-center px-8 py-3 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity text-lg"
          style={{ backgroundColor: '#233dff' }}
        >
          Get Started
          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

