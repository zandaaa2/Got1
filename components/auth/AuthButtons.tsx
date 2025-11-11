'use client'

import { useAuthModal } from '@/contexts/AuthModalContext'

export default function AuthButtons() {
  const { openSignIn, openSignUp } = useAuthModal()

  return (
    <>
      <button
        onClick={openSignIn}
        className="interactive-press inline-flex items-center justify-center h-10 px-4 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
      >
        Sign In
      </button>
      <button
        onClick={openSignUp}
        className="interactive-press inline-flex items-center justify-center h-10 px-4 rounded-full bg-black text-sm font-medium text-white hover:bg-gray-900 transition-colors"
      >
        Sign Up
      </button>
    </>
  )
}



