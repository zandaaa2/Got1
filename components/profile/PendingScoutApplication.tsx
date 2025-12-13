'use client'

interface PendingScoutApplicationProps {
  application: {
    id: string
    current_workplace: string | null
    current_position: string | null
    created_at: string
  }
}

export default function PendingScoutApplication({ application }: PendingScoutApplicationProps) {
  const submittedDate = new Date(application.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-black mb-2">Scout Application Pending Review</h2>
          <p className="text-gray-600 mb-4">
            Your scout application has been submitted and is currently under review. You'll be notified once a decision has been made.
          </p>
          
          <div className="space-y-2 mb-4">
            {application.current_workplace && (
              <div>
                <span className="text-sm font-medium text-gray-700">Workplace: </span>
                <span className="text-sm text-gray-900">{application.current_workplace}</span>
              </div>
            )}
            {application.current_position && (
              <div>
                <span className="text-sm font-medium text-gray-700">Position: </span>
                <span className="text-sm text-gray-900">{application.current_position}</span>
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-gray-700">Submitted: </span>
              <span className="text-sm text-gray-900">{submittedDate}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>What's next?</strong> Our team typically reviews applications within 8 hours or less. 
              You'll receive an email notification once your application has been reviewed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
