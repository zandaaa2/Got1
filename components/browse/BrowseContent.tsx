'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import Image from 'next/image'
import VerificationBadge from '@/components/shared/VerificationBadge'

interface BrowseContentProps {
  session: any
}

interface Profile {
  id: string
  full_name: string
  organization: string | null
  position: string | null
  school: string | null
  graduation_year: number | null
  avatar_url: string | null
  role: string
  suspended_until?: string | null // Optional - may not exist until migration is run
}

/**
 * Component for browsing and searching scouts and players.
 * Displays both scouts and players with search functionality.
 * Filters out suspended scouts client-side.
 * 
 * @param session - The current user's session
 */
export default function BrowseContent({ session }: BrowseContentProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  const loadProfiles = useCallback(async () => {
    try {
      // Build query step by step to avoid any construction issues
      // Note: suspended_until may not exist yet if migration hasn't been run
      let query = supabase
        .from('profiles')
        .select('id, full_name, organization, position, school, graduation_year, avatar_url, role, suspended_until')
      
      // Apply ordering
      query = query.order('full_name', { ascending: true })

      const { data, error } = await query

      if (error) {
        console.error('Error loading profiles:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        setProfiles([])
        return
      }
      
      console.log('✅ Loaded profiles from database:', data?.length || 0)
      console.log('Profiles data:', data?.map(p => ({ id: p.id, name: p.full_name, role: p.role, position: p.position, org: p.organization, school: p.school })))
      
      // Filter client-side: exclude suspended scouts (not players)
      // Note: suspended_until column may not exist yet - check for it before filtering
      const now = new Date()
      const activeProfiles = (data || []).filter(p => {
        // If it's a scout and suspended, exclude it
        if (p.role === 'scout') {
          const suspendedUntil = p.suspended_until
          if (!suspendedUntil || typeof suspendedUntil !== 'string') return true
          return new Date(suspendedUntil) <= now
        }
        // Players are always included
        return true
      })
      
      console.log('✅ Filtered active profiles:', activeProfiles.length)
      console.log('Active profiles:', activeProfiles.map(p => ({ id: p.id, name: p.full_name, role: p.role })))
      setProfiles(activeProfiles)
    } catch (error: any) {
      console.error('Error loading profiles:', error)
      console.error('Error message:', error?.message)
      setProfiles([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  // Refresh profiles when window regains focus (helps catch updates)
  useEffect(() => {
    const handleFocus = () => {
      loadProfiles()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loadProfiles])

  const filteredProfiles = profiles.filter((profile) => {
    const query = searchQuery.toLowerCase()
    return (
      profile.full_name?.toLowerCase().includes(query) ||
      profile.organization?.toLowerCase().includes(query) ||
      profile.school?.toLowerCase().includes(query) ||
      profile.position?.toLowerCase().includes(query)
    )
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-black">Browse</h1>
      </div>
      
      <div className="mb-6">
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10" style={{ width: '20px', height: '20px', overflow: 'hidden' }}>
            <svg
              className="text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ width: '20px', height: '20px', display: 'block', maxWidth: '20px', maxHeight: '20px' }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search people, teams, schools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="space-y-2">
          {filteredProfiles.map((profile) => (
            <Link
              key={profile.id}
              href={`/profile/${profile.id}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name || 'Profile'}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-600 text-lg font-semibold">
                      {profile.full_name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-black text-lg flex items-center gap-2">
                  {profile.full_name || 'Unknown'}
                  {profile.role === 'scout' && <VerificationBadge />}
                </h3>
                <p className="text-black text-sm">
                  {profile.role === 'scout' ? (
                    profile.position && profile.organization
                      ? `${profile.position} at ${profile.organization}`
                      : profile.position
                      ? profile.position
                      : profile.organization
                      ? profile.organization
                      : 'Scout'
                  ) : (
                    profile.position && profile.school
                      ? `${profile.position} at ${profile.school}${profile.graduation_year ? ` (${profile.graduation_year})` : ''}`
                      : profile.position
                      ? profile.position
                      : profile.school
                      ? `${profile.school}${profile.graduation_year ? ` (${profile.graduation_year})` : ''}`
                      : profile.graduation_year
                      ? `Class of ${profile.graduation_year}`
                      : 'Player'
                  )}
                </p>
              </div>
            </Link>
          ))}
          
          {filteredProfiles.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No profiles found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

