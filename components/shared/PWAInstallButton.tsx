'use client'

import { useState, useEffect } from 'react'

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if we're on mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(iOS)

    // Check if app is already installed
    const checkInstalled = () => {
      // Check for standalone mode (iOS)
      const isStandalone = (window.navigator as any).standalone === true
      
      // Check for standalone mode (Android/Chrome)
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      
      // Check if running as TWA (Trusted Web Activity)
      const isTWA = document.referrer.includes('android-app://')
      
      setIsInstalled(isStandalone || isStandaloneMode || isTWA)
    }

    checkInstalled()

    // Listen for beforeinstallprompt event (Chrome/Edge - works on Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setShowIOSInstructions(false)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    // For iOS, show instructions modal
    if (isIOS) {
      setShowIOSInstructions(true)
      return
    }

    // For Android mobile without prompt, show instructions
    if (isMobile && !deferredPrompt) {
      setShowIOSInstructions(true) // Reuse the instructions modal
      return
    }

    // For Android/Desktop, use the install prompt
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null)
  }

  // Don't show button if app is already installed
  if (isInstalled) {
    return null
  }

  // Show button if:
  // - On mobile (always show - iOS will show instructions, Android will attempt install) OR
  // - On desktop (has deferredPrompt)
  const shouldShow = isMobile || deferredPrompt

  if (!shouldShow) {
    return null
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`interactive-press inline-flex items-center justify-center rounded-full text-black font-semibold hover:opacity-90 transition-opacity ${
          isMobile 
            ? 'px-3 py-1.5 text-xs' 
            : 'px-4 py-2 text-sm'
        }`}
        style={{ backgroundColor: '#FFEB3B' }}
      >
        🎉 {isMobile ? 'Install' : 'Install Desktop App'}
      </button>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => setShowIOSInstructions(false)}
        >
          <div 
            className="bg-gray-100 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-black">Add to Home Screen</h3>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 text-sm text-gray-700">
              <p>To install Got1 on your {isIOS ? 'iPhone' : 'mobile device'}:</p>
              {isIOS ? (
                <ol className="list-decimal list-inside space-y-2 pl-2">
                  <li>Tap the <strong>Share</strong> button <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> at the bottom of the screen</li>
                  <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>"Add"</strong> in the top right corner</li>
                </ol>
              ) : (
                <ol className="list-decimal list-inside space-y-2 pl-2">
                  <li>Tap the menu button (three dots) in your browser</li>
                  <li>Select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
                  <li>Confirm by tapping <strong>"Add"</strong> or <strong>"Install"</strong></li>
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

