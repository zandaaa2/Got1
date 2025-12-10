'use client'

import { useAuthModal } from '@/contexts/AuthModalContext'

export default function AuthButtons() {
  const { openSignUp } = useAuthModal()

  return (
    <div data-auth-buttons className="flex items-center gap-3">
      <button
        onClick={openSignUp}
        className="interactive-press inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-medium text-white hover:opacity-90 transition-opacity"
        style={{ backgroundColor: '#233dff' }}
      >
        Get started
      </button>
    </div>
  )
}



