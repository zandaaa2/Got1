'use client'

import { AuthModalProvider as BaseAuthModalProvider } from '@/contexts/AuthModalContext'

export default function AuthModalProvider({ children }: { children: React.ReactNode }) {
  return <BaseAuthModalProvider>{children}</BaseAuthModalProvider>
}








