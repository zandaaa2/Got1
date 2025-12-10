'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthModal } from '@/contexts/AuthModalContext'

interface WelcomeNavbarProps {
  showBecomeScout?: boolean
  variant?: 'transparent' | 'visible'
}

const blogPosts = [
  { title: 'How to Get Recruited by College Scouts', slug: '/blog/get-recruited' },
  { title: 'What Scouts Look for in Game Film', slug: '/blog/scout-requirements' },
  { title: 'Understanding the Recruiting Process', slug: '/blog/recruiting-process' },
]

export default function WelcomeNavbar({ showBecomeScout = true, variant = 'transparent' }: WelcomeNavbarProps) {
  const { openSignUp, openSignUpOnly } = useAuthModal()
  const [showBlogDropdown, setShowBlogDropdown] = useState(false)
  
  const handleBecomeScoutClick = (e: React.MouseEvent) => {
    e.preventDefault()
    openSignUpOnly()
  }

  const isVisible = variant === 'visible'
  const navClasses = isVisible
    ? 'sticky w-full border-b border-gray-200 bg-white top-0 z-50'
    : 'absolute w-full border-b border-white/20 bg-transparent top-0 z-50'
  
  const linkClasses = isVisible
    ? 'text-sm font-medium text-gray-700 hover:text-black transition-colors'
    : 'text-sm font-medium text-white/90 hover:text-white transition-colors drop-shadow-md'
  
  const logoClasses = isVisible
    ? 'text-xl font-bold text-black'
    : 'text-xl font-bold text-white drop-shadow-lg'

  const blogButtonClasses = isVisible
    ? 'flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-black transition-colors'
    : 'flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white transition-colors drop-shadow-md'

  return (
    <nav className={navClasses}>
      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className={logoClasses}>
              Got1
            </Link>
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
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg z-20 py-2">
                    {blogPosts.map((post) => (
                      <Link
                        key={post.slug}
                        href={post.slug}
                        onClick={() => setShowBlogDropdown(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
                      >
                        {post.title}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={openSignUp}
              className="inline-flex items-center justify-center h-9 px-4 rounded-full text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#233dff' }}
            >
              Get started
            </button>
          </div>

          <div className="md:hidden">
            <button
              onClick={openSignUp}
              className="inline-flex items-center justify-center h-9 px-4 rounded-full text-sm font-medium text-white shadow-lg"
              style={{ backgroundColor: '#233dff' }}
            >
              Get started
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
