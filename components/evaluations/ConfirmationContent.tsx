'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ConfirmationContentProps {
  evaluation: any
}

export default function ConfirmationContent({ evaluation }: ConfirmationContentProps) {
  const router = useRouter()
  const player = evaluation.player

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-black mb-2">
          Confirmation of Submission
        </h1>
        <p className="text-lg text-black">
          Your evaluation for {player?.full_name || 'this player'} has been submitted successfully.
        </p>
      </div>

      <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200 text-left">
        <h2 className="text-xl font-bold text-black mb-4">Evaluation Details</h2>
        <div className="space-y-2">
          <p className="text-black">
            <span className="font-semibold">Player:</span> {player?.full_name || 'Unknown'}
          </p>
          <p className="text-black">
            <span className="font-semibold">School:</span>{' '}
            {player?.school || 'Unknown'}
            {player?.school && player?.graduation_year && ', '}
            {player?.graduation_year && `${player.graduation_year}`}
          </p>
          <p className="text-black">
            <span className="font-semibold">Status:</span> Completed
          </p>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <Link
          href="/my-evals"
          className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800"
        >
          Back to My Evals
        </Link>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 border border-black text-black rounded hover:bg-gray-50"
        >
          View Evaluation
        </button>
      </div>
    </div>
  )
}

