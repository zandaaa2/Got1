'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProfileMenuProps {
  profileUrl: string
  profileName: string
  profileType?: 'profile' | 'team' | 'school'
  isSignedIn: boolean
  onReport?: (profileId: string, profileName: string, profileType?: string) => void
  profileId?: string
}

export default function ProfileMenu({
  profileUrl,
  profileName,
  profileType = 'profile',
  isSignedIn,
  onReport,
  profileId,
}: ProfileMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const router = useRouter()

  const handleCopyUrl = async () => {
    try {
      const fullUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}${profileUrl}`
        : profileUrl

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
    if (onReport && profileId) {
      onReport(profileId, profileName, profileType)
    }
  }

  return (
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
              Share {profileType === 'team' ? 'team' : profileType === 'school' ? 'school' : 'profile'}
            </button>
            {onReport && (
              <button
                onClick={handleReport}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Report {profileType === 'team' ? 'team' : profileType === 'school' ? 'school' : 'profile'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}


