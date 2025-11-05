'use client'

import { useAuthModal } from '@/contexts/AuthModalContext'

export default function AuthButtons() {
  const { openSignIn, openSignUp } = useAuthModal()

  return (
    <>
      <button
        onClick={openSignIn}
        className="px-4 py-2 border border-black rounded text-black hover:bg-gray-50 transition-colors"
      >
        Sign In
      </button>
      <button
        onClick={openSignUp}
        className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
      >
        Sign Up
      </button>
    </>
  )
}


