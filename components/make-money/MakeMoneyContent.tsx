'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { useAuthModal } from '@/contexts/AuthModalContext'
import Image from 'next/image'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getGradientForId } from '@/lib/gradients'

interface MakeMoneyContentProps {
  session: any
}

interface ReferralApplication {
  id: string
  user_id: string
  status: 'pending' | 'approved' | 'denied'
  created_at: string
  reviewed_at: string | null
}

interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  referrer_role: string
  referred_role: string
  amount_earned: number
  status: 'pending' | 'approved' | 'paid'
  created_at: string
  referrer_profile?: {
    full_name: string | null
    username: string | null
    avatar_url: string | null
  }
}

interface LeaderboardEntry {
  user_id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  total_earned: number
  total_referrals: number
}

export default function MakeMoneyContent({ session }: MakeMoneyContentProps) {
  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState<ReferralApplication | null>(null)
  const [myReferrals, setMyReferrals] = useState<Referral[]>([])
  const [totalEarned, setTotalEarned] = useState(0)
  const [pendingEarnings, setPendingEarnings] = useState(0)
  const [approvedEarnings, setApprovedEarnings] = useState(0)
  const [submittingApplication, setSubmittingApplication] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isScout, setIsScout] = useState(false)
  const [isBasicUser, setIsBasicUser] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { openSignUp } = useAuthModal()

  // Load user's application and referral stats
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check user profile and role (if logged in)
        let userIsScout = false
        let userIsBasic = false
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle()

          setUserProfile(profile)
          userIsScout = profile?.role === 'scout'
          userIsBasic = profile?.role === 'user'
          setIsScout(userIsScout)
          setIsBasicUser(userIsBasic)
        }

        // Load leaderboard (available to everyone)
        try {
          const { data: leaderboardData, error: leaderboardError } = await supabase
            .from('referrals')
            .select('referrer_id, amount_earned, status')
            .in('status', ['approved', 'paid'])

          if (leaderboardError) {
            console.error('Error loading leaderboard:', leaderboardError)
            setLeaderboard([])
          } else if (leaderboardData && leaderboardData.length > 0) {
            // Aggregate by referrer
            const earningsMap = new Map<string, { total: number; count: number }>()
            leaderboardData.forEach((ref) => {
              const existing = earningsMap.get(ref.referrer_id) || { total: 0, count: 0 }
              earningsMap.set(ref.referrer_id, {
                total: existing.total + parseFloat(ref.amount_earned.toString()),
                count: existing.count + 1,
              })
            })

            // Get profiles for top earners
            const topEarnerIds = Array.from(earningsMap.entries())
              .sort((a, b) => b[1].total - a[1].total)
              .slice(0, 10)
              .map(([userId]) => userId)

            if (topEarnerIds.length > 0) {
              const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('user_id, full_name, username, avatar_url')
                .in('user_id', topEarnerIds)

              if (profilesError) {
                console.error('Error loading profiles for leaderboard:', profilesError)
                setLeaderboard([])
              } else {
                const leaderboardEntries: LeaderboardEntry[] = topEarnerIds
                  .map((userId) => {
                    const profile = profiles?.find(p => p.user_id === userId)
                    const stats = earningsMap.get(userId) || { total: 0, count: 0 }
                    return {
                      user_id: userId,
                      full_name: profile?.full_name || null,
                      username: profile?.username || null,
                      avatar_url: profile?.avatar_url || null,
                      total_earned: stats.total,
                      total_referrals: stats.count,
                    }
                  })
                  .sort((a, b) => b.total_earned - a.total_earned)

                setLeaderboard(leaderboardEntries)
              }
            } else {
              setLeaderboard([])
            }
          } else {
            // No referrals yet
            setLeaderboard([])
          }
        } catch (leaderboardError) {
          console.error('Error in leaderboard loading:', leaderboardError)
          setLeaderboard([])
        }

        // User-specific data (only if logged in and is a scout)
        if (!session || !userIsScout) {
          setLoading(false)
          return
        }

        // Get user's referral application
        const { data: app } = await supabase
          .from('referral_program_applications')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()

        setApplication(app || null)

        // Get user's referrals (as referrer)
        const { data: referrals } = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', session.user.id)
          .order('created_at', { ascending: false })

        if (referrals) {
          // Load referrer profiles for display
          const referralsWithProfiles = await Promise.all(
            referrals.map(async (ref) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('user_id', ref.referred_id)
                .maybeSingle()

              return {
                ...ref,
                referred_profile: profile || null,
              }
            })
          )

          setMyReferrals(referralsWithProfiles as any)

          // Calculate earnings
          const pending = referrals
            .filter(r => r.status === 'pending')
            .reduce((sum, r) => sum + parseFloat(r.amount_earned.toString()), 0)
          const approved = referrals
            .filter(r => r.status === 'approved')
            .reduce((sum, r) => sum + parseFloat(r.amount_earned.toString()), 0)
          const total = referrals
            .filter(r => r.status === 'approved' || r.status === 'paid')
            .reduce((sum, r) => sum + parseFloat(r.amount_earned.toString()), 0)

          setPendingEarnings(pending)
          setApprovedEarnings(approved)
          setTotalEarned(total)
        }
      } catch (error) {
        console.error('Error loading referral data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [session, supabase])

  const handleApply = async () => {
    if (!session) {
      openSignUp()
      return
    }

    setSubmittingApplication(true)
    try {
      const response = await fetch('/api/referrals/apply', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application')
      }

      setApplication(data.application)
      alert('Application submitted successfully! We will review it soon.')
    } catch (error: any) {
      console.error('Error submitting application:', error)
      alert(error.message || 'Failed to submit application. Please try again.')
    } finally {
      setSubmittingApplication(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const isApproved = application?.status === 'approved'
  const isPending = application?.status === 'pending'
  const isDenied = application?.status === 'denied'

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-8">
        Make Money
      </h1>

      {/* Instructions and Leaderboard Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Instructions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-black mb-4">How It Works</h2>
          <div className="space-y-3 text-gray-700">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
                1
              </span>
              <p>
                <strong>Apply to join</strong> - Scouts can submit an application to join the referral program
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
                2
              </span>
              <p>
                <strong>Get approved</strong> - Once approved, you can start referring users and earning money
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
                3
              </span>
              <p>
                <strong>Share your link</strong> - When new users sign up, they can select you as their referrer
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
                4
              </span>
              <p>
                <strong>Get paid</strong> - Earn <strong>$5 for each scout</strong> and <strong>$2 for each player</strong> you refer! Payments are processed through your existing Stripe account.
              </p>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-black mb-4">Top Referrers</h2>
          {leaderboard.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {leaderboard.map((entry, index) => {
                const avatarUrl = entry.avatar_url && isMeaningfulAvatar(entry.avatar_url)
                  ? entry.avatar_url
                  : null
                const initial = (entry.full_name || entry.username || '?').charAt(0).toUpperCase()
                const gradientKey = entry.user_id

                return (
                  <div
                    key={entry.user_id}
                    className={`p-3 flex items-center justify-between rounded-lg border ${
                      entry.user_id === session?.user?.id 
                        ? 'bg-gray-50 border-gray-300' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="w-6 text-center font-bold text-gray-500 text-sm flex-shrink-0">
                        #{index + 1}
                      </span>
                      {avatarUrl && !imageErrors.has(entry.user_id) ? (
                        <Image
                          src={avatarUrl}
                          alt=""
                          width={32}
                          height={32}
                          className="rounded-full object-cover flex-shrink-0"
                          onError={() => setImageErrors(prev => new Set(prev).add(entry.user_id))}
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${getGradientForId(gradientKey)}`}>
                          {initial}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-black text-sm truncate">
                          {entry.full_name || 'Unknown User'}
                          {entry.user_id === session?.user?.id && (
                            <span className="ml-1 text-xs text-gray-600">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600">
                          {entry.total_referrals} referral{entry.total_referrals !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <p className="text-base font-bold text-black ml-2 flex-shrink-0">
                      ${entry.total_earned.toFixed(2)}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No referrals yet. Be the first to earn!</p>
            </div>
          )}
        </div>
      </div>

      {/* Application Status */}
      {!session ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 text-center">
          <p className="text-gray-700 mb-4">Sign in as a scout to apply for the referral program</p>
          <button
            onClick={() => openSignUp()}
            className="interactive-press inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Sign In / Sign Up
          </button>
        </div>
      ) : isBasicUser ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-black mb-2">Apply for Scout Status</h3>
          <p className="text-gray-600 mb-4">
            To participate in the referral program, you need to be a verified scout. Apply for scout status to get started.
          </p>
          <button
            onClick={() => router.push('/profile/scout-application')}
            className="interactive-press px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Apply for Scout Status
          </button>
        </div>
      ) : userProfile?.role === 'player' ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-black mb-2">Scouts Only</h3>
          <p className="text-gray-600">
            The referral program is only available for verified scouts. Players are not eligible for the referral program.
          </p>
        </div>
      ) : !isScout ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-black mb-2">Scouts Only</h3>
          <p className="text-gray-700 mb-4">
            The referral program is only available for verified scouts. Scouts already have Stripe accounts set up, making payments seamless.
          </p>
          {userProfile?.role === 'player' && (
            <p className="text-sm text-gray-600 mb-4">
              You're currently set up as a player. To become a scout, please submit a scout application first.
            </p>
          )}
        </div>
      ) : !application ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-black mb-2">Join the Referral Program</h3>
          <p className="text-gray-600 mb-4">
            Apply to start earning money by referring new users to Got1! As a scout, payments will be processed through your existing Stripe account.
          </p>
          <button
            onClick={handleApply}
            disabled={submittingApplication}
            className="interactive-press px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submittingApplication ? 'Submitting...' : 'Apply Now'}
          </button>
        </div>
      ) : isPending ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-black mb-2">Application Pending</h3>
          <p className="text-gray-700">
            Your application is under review. We'll notify you once a decision has been made.
          </p>
        </div>
      ) : isDenied ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-black mb-2">Application Denied</h3>
          <p className="text-gray-700 mb-4">
            Unfortunately, your application was not approved at this time.
          </p>
          <button
            onClick={handleApply}
            disabled={submittingApplication}
            className="interactive-press px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submittingApplication ? 'Submitting...' : 'Reapply'}
          </button>
        </div>
      ) : isApproved ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">Total Earned</p>
              <p className="text-2xl font-bold text-black">${totalEarned.toFixed(2)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-600">${pendingEarnings.toFixed(2)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">Total Referrals</p>
              <p className="text-2xl font-bold text-black">{myReferrals.length}</p>
            </div>
          </div>

          {/* Share Your Link */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-black mb-2">Share Your Referral Link</h3>
            <p className="text-gray-600 mb-4">
              Share this link with people you want to refer. When they sign up and select you as their referrer, you'll earn money!
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : 'https://got1.app'}/profile/user-setup?ref=${session.user.id}`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700"
              />
              <button
                onClick={async () => {
                  const link = `${window.location.origin}/profile/user-setup?ref=${session.user.id}`
                  try {
                    await navigator.clipboard.writeText(link)
                    alert('Link copied to clipboard!')
                  } catch (err) {
                    alert('Failed to copy link. Please copy manually.')
                  }
                }}
                className="interactive-press px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          {/* My Referrals */}
          {myReferrals.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-black mb-4">My Referrals</h3>
              <div className="space-y-3">
                {myReferrals.map((ref) => {
                  const profile = (ref as any).referred_profile
                  const avatarUrl = profile?.avatar_url && isMeaningfulAvatar(profile.avatar_url)
                    ? profile.avatar_url
                    : null
                  const initial = (profile?.full_name || profile?.username || '?').charAt(0).toUpperCase()
                  const gradientKey = ref.referred_id

                  return (
                    <div
                      key={ref.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {avatarUrl && !imageErrors.has(ref.referred_id) ? (
                          <Image
                            src={avatarUrl}
                            alt=""
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                            onError={() => setImageErrors(prev => new Set(prev).add(ref.referred_id))}
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getGradientForId(gradientKey)}`}>
                            {initial}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-black">
                            {profile?.full_name || 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {ref.referred_role === 'scout' ? 'Scout' : 'Player'} • ${ref.amount_earned.toFixed(2)} earned
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          ref.status === 'approved' || ref.status === 'paid'
                            ? 'bg-gray-100 text-gray-700'
                            : ref.status === 'pending'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {ref.status.charAt(0).toUpperCase() + ref.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </>
      ) : null}
    </div>
  )
}

