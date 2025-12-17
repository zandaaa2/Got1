'use client'

import { useState } from 'react'
import Link from 'next/link'
import VerificationBadge from '@/components/shared/VerificationBadge'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getProfilePath } from '@/lib/profile-url'

interface Profile {
  id: string
  user_id: string | null
  full_name: string | null
  username?: string | null
  avatar_url: string | null
  position: string | null
  role: 'scout' | 'player'
  price_per_eval?: number | null
  sports?: string[] | null
}

interface TeamTabsProps {
  connections: Profile[]
  employees: Profile[]
  teamName: string
}

const getScoutInitial = (name: string | null) => name?.trim()?.charAt(0).toUpperCase() || 'S'

const renderProfileAvatar = (profile: Profile) => {
  const avatarUrl = isMeaningfulAvatar(profile.avatar_url) ? profile.avatar_url : null
  const gradientClass = getGradientForId(
    profile.user_id || profile.id || profile.full_name || 'profile'
  )

  return (
    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden flex-shrink-0">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={profile.full_name || 'Profile'}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center text-lg font-semibold text-white ${gradientClass}`}
        >
          {getScoutInitial(profile.full_name)}
        </div>
      )}
    </div>
  )
}

const renderProfileCard = (profile: Profile) => (
  <Link
    key={profile.id}
    href={getProfilePath(profile.id, profile.username)}
    className="flex items-center gap-3 md:gap-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all"
  >
    {renderProfileAvatar(profile)}
    <div className="flex-1 min-w-0">
      <h4 className="font-semibold text-black text-base md:text-lg flex items-center gap-2 truncate">
        {profile.full_name || (profile.role === 'scout' ? 'Scout' : 'Player')}
        <VerificationBadge />
      </h4>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">
          {profile.role}
        </span>
        {profile.position && (
          <span className="text-xs md:text-sm text-gray-600 truncate">
            {profile.position}
          </span>
        )}
      </div>
    </div>
    {profile.role === 'scout' && typeof profile.price_per_eval === 'number' && (
      <div className="flex-shrink-0 text-right">
        <p className="text-sm md:text-base text-blue-600 font-semibold">
          ${profile.price_per_eval}
        </p>
        <p className="text-xs text-gray-400">per evaluation</p>
      </div>
    )}
  </Link>
)

export default function TeamTabs({ connections, employees, teamName }: TeamTabsProps) {
  const [activeTab, setActiveTab] = useState<'connections' | 'employees'>('connections')

  const groupBySport = (profiles: Profile[]) => {
    const sportMap = new Map<string, Profile[]>()
    const unspecified: Profile[] = []

    profiles.forEach((profile) => {
      const sportsArray = Array.isArray(profile.sports) ? profile.sports : []
      const uniqueSports = Array.from(new Set(sportsArray.filter(Boolean)))

      if (uniqueSports.length === 0) {
        unspecified.push(profile)
        return
      }

      uniqueSports.forEach((sport) => {
        const normalizedSport = sport.trim()
        if (!normalizedSport) return
        const list = sportMap.get(normalizedSport) ?? []
        list.push(profile)
        sportMap.set(normalizedSport, list)
      })
    })

    return { sportMap, unspecified }
  }

  const renderProfilesList = (profiles: Profile[]) => {
    if (profiles.length === 0) {
      return (
        <div className="border border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center text-gray-500">
          No {activeTab === 'connections' ? 'connections' : 'employees'} found for {teamName}.
        </div>
      )
    }

    const { sportMap, unspecified } = groupBySport(profiles)
    const sportGroups = Array.from(sportMap.entries()).sort((a, b) => b[1].length - a[1].length)

    if (sportGroups.length === 0 && unspecified.length === 0) {
      return null
    }

    return (
      <div className="space-y-2">
        {sportGroups.map(([sport, sportProfiles]) => (
          <div key={sport} className="space-y-2">
            {sportProfiles.map((profile) => renderProfileCard(profile))}
          </div>
        ))}

        {unspecified.length > 0 && (
          <div className="space-y-2">
            {unspecified.map((profile) => renderProfileCard(profile))}
          </div>
        )}
      </div>
    )
  }

  return (
    <section>
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex gap-6 md:gap-8">
            <button
              onClick={() => setActiveTab('connections')}
              className={`pb-3 px-1 text-sm md:text-base font-medium transition-colors ${
                activeTab === 'connections'
                  ? 'text-black border-b-2 border-black'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Connections ({connections.length})
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`pb-3 px-1 text-sm md:text-base font-medium transition-colors ${
                activeTab === 'employees'
                  ? 'text-black border-b-2 border-black'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Employees ({employees.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'connections' ? (
          <div>
            {renderProfilesList(connections)}
          </div>
        ) : (
          <div>
            <div className="mb-6 text-center md:text-left">
              <h2 className="text-lg md:text-xl font-semibold text-black">Employees</h2>
              <p className="text-sm md:text-base text-gray-600">
                Scouts who list {teamName} as their current organization on Got1.
              </p>
            </div>
            {renderProfilesList(employees)}
          </div>
        )}
      </div>
    </section>
  )
}

