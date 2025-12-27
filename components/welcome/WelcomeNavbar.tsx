'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { useRouter } from 'next/navigation'
import Logo from '@/components/shared/Logo'
import { createClient } from '@/lib/supabase-client'

export default function WelcomeNavbar({ showBecomeScout = true, variant = 'transparent' }: WelcomeNavbarProps) {
  const { openSignUp } = useAuthModal()
  const router = useRouter()
  
  const handleGetStarted = () => {
    // Set flag that user wants to sign up for player/parent flow
    if (typeof window !== 'undefined') {
      localStorage.setItem('playerparent_onboarding', 'true')
      localStorage.removeItem('scout_onboarding') // Clear any stale scout flag
      // Set cookie so middleware can check it server-side
      document.cookie = 'playerparent_onboarding=true; path=/; max-age=3600' // 1 hour
    }
    // Navigate to player/parent onboarding step 1
    router.push('/playerparent?step=1')
  }
  const [showBlogDropdown, setShowBlogDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isAppInstalled, setIsAppInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [blogPosts, setBlogPosts] = useState<Array<{
    slug: string
    title: string
    image: string
    excerpt: string
  }>>([])
  const [loadingBlogs, setLoadingBlogs] = useState(false)
  
  const handleBecomeScoutClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // Set flag that user wants to become a scout
    if (typeof window !== 'undefined') {
      localStorage.setItem('scout_onboarding', 'true')
      localStorage.removeItem('playerparent_onboarding') // Clear player/parent flag
      // Set cookie so middleware can check it server-side
      document.cookie = 'scout_onboarding=true; path=/; max-age=3600' // 1 hour
      document.cookie = 'playerparent_onboarding=; path=/; max-age=0' // Clear player/parent cookie
    }
    // Navigate to new scout onboarding flow
    window.location.href = '/scout'
  }

  // Fetch blog posts
  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        setLoadingBlogs(true)
        const supabase = createClient()
        const { data, error } = await supabase
          .from('blog_posts')
          .select('slug, title, image, excerpt')
          .order('published_at', { ascending: false })
          .limit(5)

        if (error) throw error

        if (data) {
          setBlogPosts(data.map(post => ({
            slug: `/blog/${post.slug}`,
            title: post.title,
            image: post.image || '/placeholder-blog.jpg',
            excerpt: post.excerpt || ''
          })))
        }
      } catch (error) {
        console.error('Error fetching blog posts:', error)
      } finally {
        setLoadingBlogs(false)
      }
    }

    fetchBlogPosts()
  }, [])

  // Check if app is installed and handle PWA install prompt
  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = (window.navigator as any).standalone === true
    
    if (isStandalone || isIOSStandalone) {
      setIsAppInstalled(true)
      setDeferredPrompt(null)
      return
    }

    // App is not installed, so we can show install option
    setIsAppInstalled(false)

    // Listen for beforeinstallprompt event (Android Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      // For iOS, show instructions
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        alert('To install: Tap the Share button and select "Add to Home Screen"')
        return
      }
      return
    }

    // Show the install prompt
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setIsAppInstalled(true)
      setDeferredPrompt(null)
    }
    
    setShowMobileMenu(false)
  }

  const isVisible = variant === 'visible'
  const navClasses = isVisible
    ? 'sticky w-full border-b border-gray-200 bg-white top-0 z-50'
    : 'absolute w-full border-b border-white/20 bg-transparent top-0 z-50'
  
  const linkClasses = isVisible
    ? 'text-sm font-medium text-gray-700 hover:text-black transition-colors'
    : 'text-sm font-medium text-white/90 hover:text-white transition-colors drop-shadow-md'

  const blogButtonClasses = isVisible
    ? 'flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-black transition-colors'
    : 'flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white transition-colors drop-shadow-md'

  return (
    <nav className={navClasses}>
      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Logo
              variant={isVisible ? 'regular' : 'white'}
              width={60}
              height={18}
              linkToHome={true}
              className={isVisible ? '' : 'drop-shadow-lg'}
            />
          </div>

          <div className="hidden md:flex items-center gap-6">
            {showBecomeScout && (
              <button
                onClick={handleBecomeScoutClick}
                className={linkClasses}
              >
                Become a Scout
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowBlogDropdown(!showBlogDropdown)}
                className={blogButtonClasses}
              >
                Blog
                <svg
                  className={`w-4 h-4 transition-transform ${showBlogDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showBlogDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowBlogDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg z-20 py-2 max-h-96 overflow-y-auto">
                    {loadingBlogs ? (
                      <div className="px-4 py-2 text-sm text-gray-500">Loading blogs...</div>
                    ) : blogPosts.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500">No blogs available</div>
                    ) : (
                      blogPosts.map((post) => (
                        <Link
                          key={post.slug}
                          href={post.slug}
                          onClick={() => setShowBlogDropdown(false)}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                        >
                          {/* Small thumbnail image */}
                          <div className="relative w-16 h-12 flex-shrink-0 rounded overflow-hidden">
                            <Image
                              src={post.image}
                              alt={post.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                              unoptimized
                            />
                          </div>
                          {/* Title */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                              {post.title}
                            </p>
                          </div>
                        </Link>
                      ))
                    )}
                    {/* View all blogs link */}
                    {blogPosts.length > 0 && (
                      <div className="border-t border-gray-200 mt-2 pt-2">
                        <Link
                          href="/blog"
                          onClick={() => setShowBlogDropdown(false)}
                          className="block px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-gray-50 transition-colors text-center"
                        >
                          View all blogs →
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleGetStarted}
              className="inline-flex items-center justify-center h-9 px-4 rounded-full text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#233dff' }}
            >
              Get started
            </button>
          </div>

          {/* Mobile Hamburger Menu */}
          <div className="md:hidden">
            <button
              onClick={() => setShowMobileMenu(true)}
              className={`p-2 hover:opacity-80 transition-opacity ${
                isVisible ? 'text-gray-700' : 'text-white'
              }`}
              aria-label="Open menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          {/* Mobile Side Menu */}
          {showMobileMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setShowMobileMenu(false)}
              />
              
              {/* Side Drawer */}
              <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 md:hidden animate-slide-in-right">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-black">Menu</h2>
                    <button
                      onClick={() => setShowMobileMenu(false)}
                      className="p-2 text-gray-600 hover:text-black transition-colors"
                      aria-label="Close menu"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Menu Items */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-0">
                    <nav className="space-y-2">
                      {showBecomeScout && (
                        <button
                          onClick={(e) => {
                            handleBecomeScoutClick(e)
                            setShowMobileMenu(false)
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-normal text-black hover:bg-gray-50 transition-colors"
                        >
                          <svg
                            className="w-5 h-5 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Become a Scout
                        </button>
                      )}

                      <Link
                        href="/blog"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded text-sm font-normal text-black hover:bg-gray-50 transition-colors"
                      >
                        <svg
                          className="w-5 h-5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                          />
                        </svg>
                        Blog
                      </Link>

                      {/* Install App - only show if not installed and prompt is available or iOS */}
                      {!isAppInstalled && (
                        <button
                          onClick={handleInstallApp}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-normal text-black hover:bg-gray-50 transition-colors"
                        >
                          <svg
                            className="w-5 h-5 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          Install App
                        </button>
                      )}

                      <div className="pt-4 border-t border-gray-200 mt-4">
                        <button
                          onClick={() => {
                            openSignUp()
                            setShowMobileMenu(false)
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: '#233dff' }}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />
                          </svg>
                          Get started
                        </button>
                      </div>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
