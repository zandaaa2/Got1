'use client'

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase-client'

const SchoolMenu = dynamic(() => import('@/components/shared/SchoolMenu'), {
  ssr: false,
})

interface PublicSchoolViewProps {
  school: any
  isAdmin: boolean
  coaches: any[]
  players: any[]
  evaluations: any[]
}

export default function PublicSchoolView({
  school,
  isAdmin,
  coaches,
  players,
  evaluations,
}: PublicSchoolViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'players' | 'evals'>('players')
  const [isSignedIn, setIsSignedIn] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setIsSignedIn(!!session)
    }
    checkAuth()
  }, [])
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a: any, b: any) => {
      const aNum = a.jersey_number ? parseInt(a.jersey_number, 10) : Number.POSITIVE_INFINITY
      const bNum = b.jersey_number ? parseInt(b.jersey_number, 10) : Number.POSITIVE_INFINITY
      const safeANum = Number.isNaN(aNum) ? Number.POSITIVE_INFINITY : aNum
      const safeBNum = Number.isNaN(bNum) ? Number.POSITIVE_INFINITY : bNum
      if (safeANum !== safeBNum) {
        return safeANum - safeBNum
      }
      const nameA = (a.profiles?.full_name || a.name || '').toLowerCase()
      const nameB = (b.profiles?.full_name || b.name || '').toLowerCase()
      return nameA.localeCompare(nameB)
    })
  }, [players])

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="mb-4 md:mb-6 flex items-center gap-2 text-black hover:opacity-70 text-sm md:text-base"
      >
        <svg
          className="w-5 h-5 md:w-6 md:h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="md:hidden">Back</span>
      </button>

      {/* School Profile Card */}
      <div className="relative bg-white border border-gray-200 rounded-2xl p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* School Image */}
          <div className="w-full md:w-40 h-40 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {school.logo_url || school.profile_image_url ? (
              <Image
                src={school.logo_url || school.profile_image_url}
                alt={school.name}
                width={160}
                height={160}
                className="object-cover w-full h-full"
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center text-4xl font-semibold text-white ${getGradientForId(
                  school.id
                )}`}
              >
                {school.name.charAt(0)}
              </div>
            )}
          </div>

          {/* School Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3 relative">
              {!isAdmin && (
                <div className="absolute top-0 right-0">
                  <SchoolMenu
                    schoolId={school.id}
                    schoolUsername={school.username}
                    schoolName={school.name}
                    isSignedIn={isSignedIn}
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-black mb-1">{school.name}</h1>
                {school.address && (
                  <p className="text-sm text-gray-600 mb-2">{school.address}</p>
                )}
              </div>
              {isAdmin && (
                <Link
                  href={`/high-school/${school.username}/settings`}
                  className="px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-900 text-xs font-medium transition-colors"
                >
                  Manage
                </Link>
              )}
            </div>

            {/* Social Links & Donation */}
            <div className="flex items-center gap-3 mb-4">
                {school.hudl_url && (
                  <a
                    href={school.hudl_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 h-10 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Image
                      src="/hudl.png"
                      alt="HUDL"
                      width={16}
                      height={16}
                      className="w-4 h-4"
                    />
                    HUDL
                  </a>
                )}
                {school.x_url && (
                  <a
                    href={school.x_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-10 h-10 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    aria-label="X (Twitter)"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.138 17.5h2.036L7.084 4.126H4.966z"/>
                    </svg>
                  </a>
                )}
                <a
                  href={school.donation_link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-3 h-10 text-sm border border-gray-300 rounded-lg transition-colors ${
                    school.donation_link
                      ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                      : 'text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                  onClick={(e) => {
                    if (!school.donation_link) {
                      e.preventDefault()
                    }
                  }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.45.85 6.067 2.148l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.285.823 3.532 1.529 3.532 2.75 0 .98-.84 1.545-2.354 1.545-1.905 0-4.038-.941-5.907-2.493L.302 20.196c2.076 1.562 5.138 2.557 8.395 2.557 2.978 0 5.361-.787 7.021-2.18 1.901-1.5 2.847-3.543 2.847-6.127 0-4.704-2.508-6.111-6.649-7.886h.01z"/>
                  </svg>
                  Donate
                </a>
              </div>

            {/* Stats */}
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1 text-gray-600">
                <span>Players:</span>
                <span className="font-semibold text-black">{players.length}</span>
              </div>
              {coaches.length > 0 && (
                <div className="flex items-center gap-1 text-gray-600">
                  <span>Coaches:</span>
                  <span className="font-semibold text-black">{coaches.length}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-gray-600">
                <span>Evaluations:</span>
                <span className="font-semibold text-black">{evaluations.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coaches Section */}
      {coaches.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-4">Coaches</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coaches.map((coach: any) => (
              <div
                key={coach.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  {coach.profiles?.avatar_url && isMeaningfulAvatar(coach.profiles.avatar_url) ? (
                    <Image
                      src={coach.profiles.avatar_url}
                      alt={coach.profiles.full_name || coach.name}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${getGradientForId(
                        coach.user_id || coach.id
                      )}`}
                    >
                      {(coach.profiles?.full_name || coach.name).charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-black truncate">
                      {coach.profiles?.full_name || coach.name}
                    </p>
                    <p className="text-sm text-gray-600">Coach</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('players')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'players'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Players ({players.length})
          </button>
          <button
            onClick={() => setActiveTab('evals')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'evals'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Evaluations ({evaluations.length})
          </button>
        </div>
      </div>

      {/* Players Tab */}
      {activeTab === 'players' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          {sortedPlayers.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">No players in roster yet.</div>
          ) : (
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 border-b border-gray-100 w-16">#</th>
                  <th className="px-4 py-3 border-b border-gray-100">Player</th>
                  <th className="px-4 py-3 border-b border-gray-100">Positions</th>
                  <th className="px-4 py-3 border-b border-gray-100">Grad</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player: any) => {
                  const jersey = player.jersey_number && !Number.isNaN(parseInt(player.jersey_number, 10))
                    ? parseInt(player.jersey_number, 10).toString()
                    : '—'
                  const gradLabel =
                    player.graduation_month && player.graduation_year
                      ? `${player.graduation_month} ${player.graduation_year}`
                      : '—'
                  const positions =
                    player.positions && Array.isArray(player.positions) && player.positions.length > 0
                      ? player.positions.join(', ')
                      : '—'
                  const playerName = player.profiles?.full_name || player.name

                  return (
                    <tr key={player.id} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{jersey}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={player.profiles?.username ? `/${player.profiles.username}` : '#'}
                          className="flex items-center gap-3"
                        >
                          {player.profiles?.avatar_url && isMeaningfulAvatar(player.profiles.avatar_url) ? (
                            <Image
                              src={player.profiles.avatar_url}
                              alt={playerName}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          ) : (
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getGradientForId(
                                player.user_id || player.id
                              )}`}
                            >
                              {playerName?.charAt(0) || '?'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-black truncate">{playerName}</p>
                            {player.profiles?.username && (
                              <p className="text-xs text-gray-500">@{player.profiles.username}</p>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{positions}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{gradLabel}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Evaluations Tab */}
      {activeTab === 'evals' && (
        <div className="space-y-4">
          {evaluations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No evaluations yet.
            </div>
          ) : (
            evaluations.map((item: any) => {
              const evaluation = item.evaluation
              if (!evaluation) return null

              return (
                <Link
                  key={evaluation.id}
                  href={`/evaluations/${evaluation.id}`}
                  className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-black">
                          {evaluation.player?.full_name || 'Player'}
                        </p>
                        <span className="text-gray-400">•</span>
                        <p className="text-gray-600 text-sm">
                          {evaluation.scout?.full_name || 'Scout'}
                          {evaluation.scout?.organization && ` at ${evaluation.scout.organization}`}
                        </p>
                      </div>
                      {evaluation.status === 'completed' && evaluation.notes && (
                        <p className="text-gray-600 text-sm line-clamp-2">{evaluation.notes}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(evaluation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        evaluation.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : evaluation.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {evaluation.status}
                    </span>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

