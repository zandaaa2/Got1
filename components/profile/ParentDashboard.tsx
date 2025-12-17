'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getProfilePath } from '@/lib/profile-url'

interface ParentDashboardProps {
  profile: any
}

export default function ParentDashboard({ profile }: ParentDashboardProps) {
  const [linkedChildren, setLinkedChildren] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')
  const [playerSearchResults, setPlayerSearchResults] = useState<any[]>([])
  const [searchingPlayer, setSearchingPlayer] = useState(false)
  const [linkingPlayer, setLinkingPlayer] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  console.log('🎯 ParentDashboard mounted with profile:', { 
    profileId: profile?.id, 
    userId: profile?.user_id, 
    role: profile?.role,
    fullProfile: profile
  })

  const loadLinkedChildren = useCallback(async () => {
    console.log('🚀 ParentDashboard: loadLinkedChildren called')
    try {
      setLoading(true)
      
      // Get session to use the actual user ID (more reliable than profile.user_id)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('❌ No session found when loading linked children')
        setLoading(false)
        return
      }

      const parentUserId = session.user.id
      console.log('🔍 Loading linked children for parent:', parentUserId)
      console.log('🔍 Profile user_id:', profile.user_id)

      // Get all parent_children relationships for this parent
      const { data: parentLinks, error: linksError } = await supabase
        .from('parent_children')
        .select('player_id')
        .eq('parent_id', parentUserId)

      if (linksError) {
        console.error('❌ Error loading parent links:', linksError)
        setLoading(false)
        return
      }

      console.log('📋 Found parent_children links:', parentLinks?.length || 0, parentLinks)

      if (!parentLinks || parentLinks.length === 0) {
        console.log('ℹ️ No parent_children links found')
        setLinkedChildren([])
        setLoading(false)
        return
      }

      // Get all player profiles
      const playerIds = parentLinks.map(link => link.player_id)
      console.log('🔍 Loading player profiles for IDs:', playerIds)
      console.log('🔍 Player IDs detail:', JSON.stringify(playerIds))
      
      // First, try to get profiles without role filter to see if they exist
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('id, user_id, role, username, full_name, created_at')
        .in('user_id', playerIds)

      console.log('🔍 All profiles (no role filter):', allProfiles?.length || 0, allProfiles)
      if (allProfilesError) {
        console.error('❌ Error loading all profiles:', allProfilesError)
      }

      // Now get profiles with role filter
      const { data: players, error: playersError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', playerIds)
        .eq('role', 'player')

      if (playersError) {
        console.error('❌ Error loading players:', playersError)
        console.error('❌ Error details:', JSON.stringify(playersError, null, 2))
        
        // If we found profiles without the role filter, use those as fallback
        if (allProfiles && allProfiles.length > 0) {
          console.warn('⚠️ Using profiles without role filter as fallback')
          // Fetch full profile data for the profiles we found
          const { data: fallbackPlayers, error: fallbackError } = await supabase
            .from('profiles')
            .select('*')
            .in('user_id', allProfiles.map(p => p.user_id))
          
          if (!fallbackError && fallbackPlayers) {
            console.log('✅ Using fallback players:', fallbackPlayers.length, fallbackPlayers)
            setLinkedChildren(fallbackPlayers)
          } else {
            setLinkedChildren([])
          }
        } else {
          setLinkedChildren([])
        }
      } else {
        console.log('✅ Loaded players:', players?.length || 0, players)
        console.log('✅ Player details:', JSON.stringify(players, null, 2))
        
        // If we found profiles without role filter but not with it, the role might be wrong
        if (allProfiles && allProfiles.length > 0 && (!players || players.length === 0)) {
          console.warn('⚠️ Found profiles but role filter excluded them. Profiles have roles:', allProfiles.map(p => ({ user_id: p.user_id, role: p.role })))
          
          // Auto-fix: Update role to 'player' for profiles that are linked but have wrong role
          const profilesToFix = allProfiles.filter(p => p.role !== 'player')
          if (profilesToFix.length > 0) {
            console.log('🔧 Auto-fixing roles for', profilesToFix.length, 'profile(s)')
            for (const profileToFix of profilesToFix) {
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ role: 'player' })
                .eq('user_id', profileToFix.user_id)
              
              if (updateError) {
                console.error(`❌ Error fixing role for ${profileToFix.user_id}:`, updateError)
              } else {
                console.log(`✅ Fixed role for profile ${profileToFix.user_id} (was: ${profileToFix.role}, now: player)`)
              }
            }
            
            // Reload players after fixing roles
            const { data: fixedPlayers, error: fixedPlayersError } = await supabase
              .from('profiles')
              .select('*')
              .in('user_id', allProfiles.map(p => p.user_id))
              .eq('role', 'player')
            
            if (!fixedPlayersError && fixedPlayers && fixedPlayers.length > 0) {
              console.log('✅ Loaded players after auto-fix:', fixedPlayers.length, fixedPlayers)
              setLinkedChildren(fixedPlayers)
            } else {
              // Fallback: Use profiles even if role fix didn't work
              const { data: fallbackPlayers, error: fallbackError } = await supabase
                .from('profiles')
                .select('*')
                .in('user_id', allProfiles.map(p => p.user_id))
              
              if (!fallbackError && fallbackPlayers) {
                console.log('✅ Using fallback players (after failed auto-fix):', fallbackPlayers.length, fallbackPlayers)
                setLinkedChildren(fallbackPlayers)
              } else {
                setLinkedChildren([])
              }
            }
          } else {
            // No profiles to fix, just use fallback
            const { data: fallbackPlayers, error: fallbackError } = await supabase
              .from('profiles')
              .select('*')
              .in('user_id', allProfiles.map(p => p.user_id))
            
            if (!fallbackError && fallbackPlayers) {
              console.log('✅ Using fallback players (wrong role):', fallbackPlayers.length, fallbackPlayers)
              setLinkedChildren(fallbackPlayers)
            } else {
              setLinkedChildren([])
            }
          }
        } else {
          setLinkedChildren(players || [])
        }
      }
    } catch (error) {
      console.error('❌ Error in loadLinkedChildren:', error)
      setLinkedChildren([])
    } finally {
      setLoading(false)
    }
  }, [supabase, profile])

  useEffect(() => {
    console.log('🔄 ParentDashboard useEffect triggered, profile.user_id:', profile?.user_id)
    if (profile?.user_id) {
      loadLinkedChildren()
    } else {
      console.warn('⚠️ Profile user_id is missing, cannot load children')
    }
  }, [profile?.user_id, profile?.id, loadLinkedChildren])

  // Search for players when query changes
  useEffect(() => {
    if (!showSearchModal) {
      setPlayerSearchQuery('')
      setPlayerSearchResults([])
      return
    }

    const searchPlayers = async () => {
      if (playerSearchQuery.length >= 2) {
        setSearchingPlayer(true)
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, user_id, username, full_name, avatar_url, position, school, graduation_year')
            .eq('role', 'player')
            .or(`username.ilike.%${playerSearchQuery}%,full_name.ilike.%${playerSearchQuery}%`)
            .limit(10)
          
          if (error) {
            console.error('Error searching players:', error)
            setPlayerSearchResults([])
          } else {
            // Filter out players that are already linked
            const linkedPlayerIds = linkedChildren.map(child => child.user_id)
            const filtered = (data || []).filter(player => !linkedPlayerIds.includes(player.user_id))
            setPlayerSearchResults(filtered)
          }
        } catch (error) {
          console.error('Error in search:', error)
          setPlayerSearchResults([])
        } finally {
          setSearchingPlayer(false)
        }
      } else {
        setPlayerSearchResults([])
      }
    }

    const timeoutId = setTimeout(searchPlayers, 300) // Debounce
    return () => clearTimeout(timeoutId)
  }, [playerSearchQuery, showSearchModal, linkedChildren, supabase])

  const handleTagPlayer = () => {
    setShowSearchModal(true)
  }

  const handleLinkPlayer = async (playerId: string) => {
    try {
      setLinkingPlayer(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const { error: linkError } = await supabase
        .from('parent_children')
        .insert({
          parent_id: session.user.id,
          player_id: playerId,
        })

      if (linkError) {
        if (linkError.code === '23505') { // Unique constraint violation
          alert('This player is already linked to your account')
        } else {
          throw linkError
        }
        setLinkingPlayer(false)
        return
      }

      // Reload linked children
      await loadLinkedChildren()
      setShowSearchModal(false)
      setPlayerSearchQuery('')
      setPlayerSearchResults([])
    } catch (error: any) {
      console.error('Error linking player:', error)
      alert(error.message || 'Failed to link player. Please try again.')
    } finally {
      setLinkingPlayer(false)
    }
  }

  const handleCreatePlayer = () => {
    router.push('/profile/parent/create-player')
  }

  if (loading) {
    return (
      <div className="mb-8 space-y-4">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-8 space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
          <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-black">My Players</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleTagPlayer}
              className="interactive-press inline-flex items-center justify-center h-10 md:h-9 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Tag Existing Player
            </button>
            <button
              onClick={handleCreatePlayer}
              className="interactive-press inline-flex items-center justify-center h-10 md:h-9 px-4 rounded-full bg-black text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              Create Player Page
            </button>
          </div>
        </div>

        {linkedChildren.length === 0 ? (
          <div className="rounded-xl md:rounded-2xl border border-gray-200 bg-white p-6 md:p-8 text-center shadow-sm">
            <p className="text-gray-600 mb-2 text-sm md:text-base">No player pages linked yet.</p>
            <p className="text-xs md:text-sm text-gray-500">
              Tag an existing player page or create a new one to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {linkedChildren.map((player) => {
              const playerPath = getProfilePath(player.id, player.username)
              const playerGradientKey = player.user_id || player.id
              const playerAvatarUrl = isMeaningfulAvatar(player.avatar_url) ? player.avatar_url : null

              return (
                <div
                  key={player.id}
                  className="rounded-xl md:rounded-2xl border border-gray-200 bg-white p-3 md:p-4 shadow-sm hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-3 md:gap-4">
                    {/* Player Avatar */}
                    <Link href={playerPath} className="flex-shrink-0">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden">
                        {playerAvatarUrl ? (
                          <Image
                            src={playerAvatarUrl}
                            alt={player.full_name || 'Player'}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${getGradientForId(playerGradientKey)}`}>
                            <span className="text-white text-lg md:text-xl font-semibold">
                              {player.full_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <Link href={playerPath} className="block hover:opacity-80 transition-opacity">
                        <h3 className="text-base md:text-lg font-semibold text-black mb-0.5 md:mb-1">
                          {player.full_name || 'Unknown Player'}
                        </h3>
                        {player.username && (
                          <p className="text-xs md:text-sm text-gray-500 mb-1.5 md:mb-2">@{player.username}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 md:gap-2 text-xs md:text-sm text-gray-600">
                          {player.position && (
                            <span className="px-2 py-0.5 md:py-1 bg-blue-50 text-blue-700 rounded text-xs md:text-sm">
                              {player.position}
                            </span>
                          )}
                          {player.school && (
                            <span>{player.school}</span>
                          )}
                          {player.graduation_year && (
                            <span>Class of {player.graduation_year}</span>
                          )}
                        </div>
                      </Link>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => router.push(`/profile/parent/edit-player/${player.id}`)}
                        className="interactive-press inline-flex items-center justify-center h-8 md:h-9 px-3 md:px-4 rounded-full border border-gray-200 bg-white text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                      >
                        <span className="hidden sm:inline">Edit</span>
                        <span className="sm:hidden">Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-black">Tag Existing Player</h3>
              <button
                onClick={() => {
                  setShowSearchModal(false)
                  setPlayerSearchQuery('')
                  setPlayerSearchResults([])
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="relative mb-4">
                <input
                  type="text"
                  value={playerSearchQuery}
                  onChange={(e) => setPlayerSearchQuery(e.target.value)}
                  placeholder="Search for player username or name..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  autoFocus
                />
                {searchingPlayer && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              {playerSearchQuery.length < 2 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  Type at least 2 characters to search for players
                </p>
              )}
              {playerSearchQuery.length >= 2 && playerSearchResults.length === 0 && !searchingPlayer && (
                <p className="text-sm text-gray-500 text-center py-8">
                  No players found matching "{playerSearchQuery}"
                </p>
              )}
              {playerSearchResults.length > 0 && (
                <div className="space-y-2">
                  {playerSearchResults.map((player: any) => {
                    const playerGradientKey = player.user_id || player.id
                    const playerAvatarUrl = isMeaningfulAvatar(player.avatar_url) ? player.avatar_url : null
                    return (
                      <button
                        key={player.user_id}
                        onClick={() => handleLinkPlayer(player.user_id)}
                        disabled={linkingPlayer}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          {playerAvatarUrl ? (
                            <Image
                              src={playerAvatarUrl}
                              alt={player.full_name || 'Player'}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${getGradientForId(playerGradientKey)}`}>
                              <span className="text-white text-lg font-semibold">
                                {player.full_name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-black">
                            {player.full_name || 'Unknown'}
                          </div>
                          {player.username && (
                            <div className="text-sm text-gray-500">@{player.username}</div>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs text-gray-600 mt-1">
                            {player.position && <span>{player.position}</span>}
                            {player.school && <span>• {player.school}</span>}
                            {player.graduation_year && <span>• Class of {player.graduation_year}</span>}
                          </div>
                        </div>
                        {linkingPlayer && (
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

