'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

export default function BottomNav() {
  const pathname = usePathname()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user?.id) {
          setUserId(session.user.id)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      }
    }
    
    loadUserData()
  }, [])

  const allNavItems = [
    {
      href: '/browse',
      label: 'Browse',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      activePaths: ['/browse', '/discover', '/whats-this'],
      requiresAuth: false
    },
    {
      href: '/my-evals',
      label: 'My Evals',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      activePaths: ['/my-evals', '/evaluations'],
      requiresAuth: true
    },
    {
      href: '/notifications',
      label: 'Notifications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      activePaths: ['/notifications'],
      requiresAuth: true
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      activePaths: ['/profile'],
      requiresAuth: true
    }
  ]

  // Filter nav items based on auth status
  const navItems = allNavItems.filter(item => !item.requiresAuth || userId)

  const isActive = (item: typeof navItems[0]) => {
    return item.activePaths.some(activePath => pathname?.startsWith(activePath))
  }

  // Don't show bottom nav if user is not authenticated (since most items require auth)
  if (!userId) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Futuristic backdrop with blur effect */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/50" />
      
      {/* Navigation items */}
      <div className="relative flex items-center justify-around h-20 px-4">
        {navItems.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center justify-center flex-1 h-full transition-all duration-300 ${
                active
                  ? 'scale-110'
                  : 'scale-100 hover:scale-105'
              }`}
            >
              {/* Icon with enhanced styling */}
              <div className={`transition-all duration-300 ${
                active 
                  ? 'text-black drop-shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
                <div className={active ? '[&>svg]:w-6 [&>svg]:h-6' : '[&>svg]:w-5 [&>svg]:h-5'}>
                  {item.icon}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
