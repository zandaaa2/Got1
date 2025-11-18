'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/shared/Modal'

interface SchoolMenuProps {
  schoolId: string
  schoolUsername: string
  schoolName: string
  isSignedIn: boolean
  isAdmin?: boolean
}

export default function SchoolMenu({ schoolId, schoolUsername, schoolName, isSignedIn, isAdmin = false }: SchoolMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const router = useRouter()

  const schoolUrl = `/high-school/${schoolUsername}`

  const handleCopyUrl = async () => {
    try {
      const fullUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}${schoolUrl}`
        : schoolUrl

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl)
      } else {
        const tempInput = document.createElement('textarea')
        tempInput.value = fullUrl
        tempInput.setAttribute('readonly', '')
        tempInput.style.position = 'absolute'
        tempInput.style.left = '-9999px'
        document.body.appendChild(tempInput)
        tempInput.select()
        document.execCommand('copy')
        document.body.removeChild(tempInput)
      }
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
      setShowMenu(false)
    } catch (error) {
      console.error('Failed to copy URL:', error)
      setCopyStatus('error')
    }
  }

  const handleReport = () => {
    if (!isSignedIn) {
      router.push('/auth/signin')
      setShowMenu(false)
      return
    }
    setShowMenu(false)
    setShowReportModal(true)
  }

  const handleSubmitReport = async () => {
    try {
      setIsSubmittingReport(true)
      const response = await fetch('/api/report/school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          schoolId,
          schoolUsername,
          schoolName,
          reason: reportReason
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit report. Please try again.')
      }

      setReportSuccess(true)
    } catch (error: any) {
      alert(error.message || 'Failed to submit report. Please try again.')
    } finally {
      setIsSubmittingReport(false)
    }
  }

  return (
    <>
      <div className="relative z-10">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="More options"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <button
                  onClick={handleCopyUrl}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share school
                </button>
                <button
                  onClick={handleReport}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Report school
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal 
        isOpen={showReportModal} 
        onClose={() => {
          setShowReportModal(false)
          setReportReason('')
          setIsSubmittingReport(false)
          setReportSuccess(false)
        }} 
        title="Report School"
      >
        {reportSuccess ? (
          <div className="space-y-4">
            <p className="text-black leading-relaxed">
              Thanks for letting us know. Our team will review this school page and take the appropriate action.
            </p>
            <button
              onClick={() => {
                setShowReportModal(false)
                setReportSuccess(false)
                setReportReason('')
              }}
              className="interactive-press w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-black leading-relaxed">
              You are reporting <strong>{schoolName}</strong>. This sends a message to the Got1 team to review this school page.
            </p>
            <div className="space-y-2">
              <label htmlFor="report-reason" className="text-sm font-semibold text-black">Reason (optional)</label>
              <textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Share any details that can help our team review this school page..."
                className="w-full min-h-[120px] border border-gray-300 rounded-lg p-3 text-black focus:outline-none focus:ring-2 focus:ring-black"
                maxLength={2000}
              />
              <p className="text-xs text-gray-500">Usernames and links are helpful if you have them.</p>
            </div>
            <button
              onClick={handleSubmitReport}
              disabled={isSubmittingReport}
              className="interactive-press w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors disabled:opacity-60 disabled:active:scale-100"
            >
              {isSubmittingReport ? 'Sending...' : 'Send Report'}
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}

