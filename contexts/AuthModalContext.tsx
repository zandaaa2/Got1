'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import AuthModal from '@/components/auth/AuthModal'

interface AuthModalContextType {
  openSignIn: () => void
  openSignUp: () => void
  openSignUpOnly: () => void
  closeModals: () => void
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined)

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [signInOpen, setSignInOpen] = useState(false)
  const [signUpOpen, setSignUpOpen] = useState(false)
  const [signUpOnlyOpen, setSignUpOnlyOpen] = useState(false)

  const openSignIn = () => {
    setSignUpOpen(false)
    setSignUpOnlyOpen(false)
    setSignInOpen(true)
  }

  const openSignUp = () => {
    setSignInOpen(false)
    setSignUpOnlyOpen(false)
    setSignUpOpen(true)
  }

  const openSignUpOnly = () => {
    setSignInOpen(false)
    setSignUpOpen(false)
    // Store flag that user wants to become a scout
    if (typeof window !== 'undefined') {
      localStorage.setItem('become_scout_signup', 'true')
    }
    setSignUpOnlyOpen(true)
  }

  const closeModals = () => {
    setSignInOpen(false)
    setSignUpOpen(false)
    setSignUpOnlyOpen(false)
  }

  return (
    <AuthModalContext.Provider value={{ openSignIn, openSignUp, openSignUpOnly, closeModals }}>
      {children}
      <AuthModal
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        mode="signin"
        onModeChange={(mode) => {
          if (mode === 'signup') {
            openSignUp()
          } else {
            openSignIn()
          }
        }}
      />
      <AuthModal
        isOpen={signUpOpen}
        onClose={() => setSignUpOpen(false)}
        mode="signup"
        onModeChange={(mode) => {
          if (mode === 'signup') {
            openSignUp()
          } else {
            openSignIn()
          }
        }}
      />
      <AuthModal
        isOpen={signUpOnlyOpen}
        onClose={() => setSignUpOnlyOpen(false)}
        mode="signup"
        hideSignInLink={true}
        onModeChange={undefined}
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

