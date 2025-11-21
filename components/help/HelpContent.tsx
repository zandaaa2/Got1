'use client'

import { useState } from 'react'
import { openCalendly15Min } from '@/lib/calendly'

interface HelpContentProps {
  userRole: string | null
  hasSession: boolean
}

export default function HelpContent({ userRole, hasSession }: HelpContentProps) {
  const [openSection, setOpenSection] = useState<'players' | 'scouts' | null>(
    userRole === 'player' ? 'players' : userRole === 'scout' ? 'scouts' : null
  )

  const playerFAQs = [
    {
      question: "How do I purchase an evaluation?",
      answer: "Browse scouts on the platform, select a scout whose expertise matches your position, and click 'Purchase Eval' on their profile. You'll be redirected to a secure payment page to complete your purchase."
    },
    {
      question: "How long does an evaluation take?",
      answer: "Turnaround time varies by scout, typically ranging from 24-72 hours. Each scout displays their estimated turnaround time on their profile."
    },
    {
      question: "What information do I need to provide?",
      answer: "You'll need to upload your game film (Hudl link), provide your position, stats (height, weight, 40-yard dash, etc.), and any other relevant athletic information. Make sure your profile is complete for the best evaluation experience."
    },
    {
      question: "How do I upload my film?",
      answer: "You can add your Hudl link directly in your profile. Go to your profile page, click 'Edit Profile', and add your Hudl link in the designated field. You can add multiple Hudl links if needed."
    },
    {
      question: "Can I get multiple evaluations?",
      answer: "Yes! You can purchase evaluations from multiple scouts to get different perspectives on your game. Each evaluation is independent and will appear in your 'My Evals' section."
    },
    {
      question: "What happens after I pay?",
      answer: "Once payment is confirmed, the scout will receive your evaluation request. They'll review your film and provide detailed feedback. You'll be notified when your evaluation is completed and can view it in your 'My Evals' section."
    },
    {
      question: "Can I share my evaluations?",
      answer: "Yes! Completed evaluations include a share button that allows you to share your evaluation with coaches, family, or on social media. You control who sees your evaluation."
    },
    {
      question: "What if I'm not satisfied with my evaluation?",
      answer: "If you have concerns about your evaluation, please reach out to us using the 'Talk to us' button in the sidebar. We're here to help ensure you have a positive experience on the platform."
    }
  ]

  const scoutFAQs = [
    {
      question: "How do I become a scout?",
      answer: "Submit a scout application through your profile page. You'll need to provide your work history, college connections, and relevant experience. Once approved by our admin team, you can start receiving evaluation requests."
    },
    {
      question: "How do I get paid?",
      answer: "You'll need to set up a Stripe Connect account through your profile. Once your Stripe account is verified and connected, payments from evaluations are automatically transferred to your account. Payouts typically take 2-3 business days."
    },
    {
      question: "How do I create offers?",
      answer: "Go to your profile edit page and scroll to the 'Evaluation Info' section. You can create multiple offers, each with a title, bio, price, turnaround time, positions, and college connections. You can create up to 7 offers."
    },
    {
      question: "How long should my turnaround time be?",
      answer: "Turnaround time is up to you, but typical ranges are 24-72 hours. Be realistic about your availability and stick to your committed turnaround time to maintain good ratings."
    },
    {
      question: "How do I complete an evaluation?",
      answer: "When you receive an evaluation request, it will appear in your 'My Evals' section. Click on the evaluation to open the editor, review the player's film, and provide detailed feedback. Click 'Mark as Complete' when finished."
    },
    {
      question: "What should I include in my evaluation?",
      answer: "Provide comprehensive feedback on strengths, areas for improvement, position-specific insights, and overall assessment. The more detailed and actionable your feedback, the more valuable it is to players and their recruiting journey."
    },
    {
      question: "Can I see a player's previous evaluations?",
      answer: "You can only see evaluations that players have chosen to share with you. Focus on providing your own unique perspective based on the film you review."
    },
    {
      question: "What if a player disputes an evaluation?",
      answer: "If a player has concerns, our team will review the situation. Please provide thorough, professional evaluations to avoid disputes. Reach out via 'Talk to us' if you need assistance."
    },
    {
      question: "How do I set my pricing?",
      answer: "You control your pricing for each offer. Consider your experience, turnaround time, and the value you provide. You can adjust pricing at any time by editing your offers in your profile."
    },
    {
      question: "How do I connect my college/NFL affiliations?",
      answer: "When creating or editing an offer, you can select up to 5 college logos or NFL teams to show your connections. This helps players understand your background and expertise."
    }
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">Help Center</h1>
        <p className="text-gray-600 text-lg">
          Find answers to common questions or reach out if you need additional support.
        </p>
      </div>

      {/* Tabs for Players/Scouts */}
      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <button
          onClick={() => setOpenSection('players')}
          className={`pb-4 px-1 text-sm font-medium transition-colors ${
            openSection === 'players'
              ? 'text-black border-b-2 border-black'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          For Players
        </button>
        <button
          onClick={() => setOpenSection('scouts')}
          className={`pb-4 px-1 text-sm font-medium transition-colors ${
            openSection === 'scouts'
              ? 'text-black border-b-2 border-black'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          For Scouts
        </button>
      </div>

      {/* Players FAQ Section */}
      {openSection === 'players' && (
        <div className="space-y-4">
          {playerFAQs.map((faq, index) => (
            <details
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:border-gray-300 transition-colors"
            >
              <summary className="font-semibold text-black text-lg mb-2 cursor-pointer list-none flex items-center justify-between">
                <span>{faq.question}</span>
                <svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4 transition-transform"
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
              </summary>
              <p className="text-gray-600 mt-4 leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>
      )}

      {/* Scouts FAQ Section */}
      {openSection === 'scouts' && (
        <div className="space-y-4">
          {scoutFAQs.map((faq, index) => (
            <details
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:border-gray-300 transition-colors"
            >
              <summary className="font-semibold text-black text-lg mb-2 cursor-pointer list-none flex items-center justify-between">
                <span>{faq.question}</span>
                <svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4 transition-transform"
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
              </summary>
              <p className="text-gray-600 mt-4 leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>
      )}

      {/* CTA Section */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Still have questions?</h2>
        <p className="text-gray-600 mb-4">
          We're here to help! Book a quick call or reach out via chat.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={openCalendly15Min}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Book a 15 min call
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && (window as any).$crisp) {
                (window as any).$crisp.push(['do', 'chat:open'])
              } else {
                alert('Chatbot coming soon! Please use the "Book a 15 min call" option.')
              }
            }}
            className="px-6 py-2 bg-white border-2 border-gray-300 text-black rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Talk to us
          </button>
        </div>
      </div>
    </div>
  )
}

