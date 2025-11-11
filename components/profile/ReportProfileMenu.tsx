'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/shared/Modal'

interface ReportProfileMenuProps {
  reportedProfileId: string
  reportedName: string | null
  reportedRole: string | null
  isSignedIn: boolean
}

export default function ReportProfileMenu({
  reportedProfileId,
  reportedName,
  reportedRole,
  isSignedIn,
}: ReportProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()

  const handleOpen = () => {
    if (!isSignedIn) {
      router.push('/auth/signin')
      return
    }
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setReason('')
    setIsSubmitting(false)
    setIsSuccess(false)
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      const response = await fetch('/api/report/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: reportedProfileId, reason }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit report. Please try again.')
      }

      setIsSuccess(true)
    } catch (error: any) {
      alert(error.message || 'Failed to submit report. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Report profile"
      >
        <svg
          className="w-5 h-5 text-black"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      <Modal isOpen={isOpen} onClose={handleClose} title="Report Profile">
        {isSuccess ? (
          <div className="space-y-4">
            <p className="text-black leading-relaxed">
              Thanks for letting us know. Our team will review this profile and take the appropriate action.
            </p>
            <button
              onClick={handleClose}
              className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-black leading-relaxed">
              You are reporting <strong>{reportedName || 'this profile'}</strong>{reportedRole ? ` (${reportedRole})` : ''}. This sends a message to the Got1 team to review their activity.
            </p>
            <div className="space-y-2">
              <label htmlFor="report-reason" className="text-sm font-semibold text-black">Reason (optional)</label>
              <textarea
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Share any details that can help our team review this profile..."
                className="w-full min-h-[120px] border border-gray-300 rounded-lg p-3 text-black focus:outline-none focus:ring-2 focus:ring-black"
                maxLength={2000}
              />
              <p className="text-xs text-gray-500">Usernames and links are helpful if you have them.</p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? 'Sending...' : 'Send Report'}
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}
