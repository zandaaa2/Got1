'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useAuthModal } from '@/contexts/AuthModalContext'
import Link from 'next/link'

export default function WelcomeFooter() {
  const [hasSession, setHasSession] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterLoading, setNewsletterLoading] = useState(false)
  const [newsletterSuccess, setNewsletterSuccess] = useState(false)
  const { openSignIn } = useAuthModal()

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(!!session)
      setLoading(false)
    }
    checkSession()
  }, [])

  const handleProtectedLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!hasSession) {
      e.preventDefault()
      // Store the intended destination for redirect after sign-in
      if (typeof window !== 'undefined') {
        localStorage.setItem('postSignUpRedirect', href)
      }
      openSignIn()
      return false
    }
  }

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasSession) {
      openSignIn()
      return
    }
    
    setNewsletterLoading(true)
    try {
      // TODO: Implement newsletter signup API
      await new Promise(resolve => setTimeout(resolve, 500))
      setNewsletterSuccess(true)
      setNewsletterEmail('')
      setTimeout(() => setNewsletterSuccess(false), 3000)
    } catch (error) {
      console.error('Newsletter signup error:', error)
    } finally {
      setNewsletterLoading(false)
    }
  }

  return (
    <footer className="w-full bg-[#1A1A1A] border-t border-gray-800 py-12">
      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-white mb-4">Got1</h3>
            <p className="text-sm text-gray-400">
              Connecting high school football players with verified college scouts.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/discover" 
                  className="text-gray-400 hover:text-white transition-colors"
                  onClick={(e) => handleProtectedLinkClick(e, '/discover')}
                >
                  Discover Scouts
                </Link>
              </li>
              <li>
                <Link 
                  href="/discover" 
                  className="text-gray-400 hover:text-white transition-colors"
                  onClick={(e) => handleProtectedLinkClick(e, '/discover')}
                >
                  Discover Schools
                </Link>
              </li>
              <li>
                <Link 
                  href="/profile/scout-application" 
                  className="text-gray-400 hover:text-white transition-colors"
                  onClick={(e) => handleProtectedLinkClick(e, '/profile/scout-application')}
                >
                  Become a Scout
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/faq" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link 
                  href="/about" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link 
                  href="/blog" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link 
                  href="/make-a-claim" 
                  className="text-gray-400 hover:text-white transition-colors"
                  onClick={(e) => handleProtectedLinkClick(e, '/make-a-claim')}
                >
                  Make a Claim
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/terms-of-service" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy-policy" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Contact & Newsletter</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="mailto:zander@got1.app" className="text-gray-400 hover:text-white transition-colors">
                  zander@got1.app
                </a>
              </li>
              <li>
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-2">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Email address"
                    className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-600"
                    required
                  />
                  <button
                    type="submit"
                    disabled={newsletterLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {newsletterSuccess ? 'Subscribed!' : newsletterLoading ? 'Subscribing...' : 'Join Newsletter'}
                  </button>
                </form>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} Got1. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
