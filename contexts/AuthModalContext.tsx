'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import AuthModal from '@/components/auth/AuthModal'

interface AuthModalContextType {
  openSignIn: () => void
  openSignUp: () => void
  closeModals: () => void
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined)

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [signInOpen, setSignInOpen] = useState(false)
  const [signUpOpen, setSignUpOpen] = useState(false)

  const openSignIn = () => {
    setSignUpOpen(false)
    setSignInOpen(true)
  }

  const openSignUp = () => {
    setSignInOpen(false)
    setSignUpOpen(true)
  }

  const closeModals = () => {
    setSignInOpen(false)
    setSignUpOpen(false)
  }

  return (
    <AuthModalContext.Provider value={{ openSignIn, openSignUp, closeModals }}>
      {children}
      <AuthModal
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        mode="signin"
      />
      <AuthModal
        isOpen={signUpOpen}
        onClose={() => setSignUpOpen(false)}
        mode="signup"
      />
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider')
  }
  return context
}

