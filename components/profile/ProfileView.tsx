'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/shared/BackButton'
import Link from 'next/link'
import VerificationBadge from '@/components/shared/VerificationBadge'
import HeaderMenu from '@/components/shared/HeaderMenu'
import Modal from '@/components/shared/Modal'
import { getProfilePath } from '@/lib/profile-url'
import { EmptyState } from '@/components/shared/EmptyState'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'
import ShareButton from '@/components/evaluations/ShareButton'
import EvaluationFooter from '@/components/home/EvaluationFooter'
import AuthModal from '@/components/auth/AuthModal'
import { collegeEntries } from '@/lib/college-data'
import PlayerOffersSection from '@/components/profile/PlayerOffersSection'
import PlayerTabs from '@/components/profile/PlayerTabs'
import JoinWaitlist from '@/components/profile/JoinWaitlist'
import ScoutProfileSections from '@/components/profile/ScoutProfileSections'
import PurchaseEvaluation from '@/components/profile/PurchaseEvaluation'
import FollowButton from '@/components/shared/FollowButton'
import PostCard from '@/components/home/PostCard'


const cardClass = 'bg-white border border-gray-200 rounded-2xl shadow-sm'

const ProfileHeroSkeleton = () => (
  <div className={`${cardClass} p-4 md:p-6 animate-pulse flex flex-row flex-wrap md:flex-nowrap gap-4 md:gap-6`}>
    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-200 mx-auto md:mx-0" />
    <div className="flex-1 w-full space-y-3">
      <div className="h-6 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-4 bg-gray-200 rounded w-full" />
    </div>
  </div>
)

const ProfileCtaSkeleton = () => (
  <div className={`${cardClass} p-4 md:p-6 animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-4`}>
    <div className="flex items-center gap-4">
      <div className="h-4 w-24 bg-gray-200 rounded" />
      <div className="h-4 w-24 bg-gray-200 rounded" />
    </div>
    <div className="h-10 w-40 bg-gray-200 rounded-full" />
  </div>
)

const EvaluationListSkeleton = () => (
  <div className={`${cardClass} p-4 md:p-6 space-y-4`}>
    {[...Array(3)].map((_, idx) => (
      <div key={idx} className="flex items-start gap-3 md:gap-4">
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    ))}
  </div>
)

const ProfileSkeletonPage = () => (
  <div className="space-y-6">
    <ProfileHeroSkeleton />
    <ProfileCtaSkeleton />
    <EvaluationListSkeleton />
  </div>
)

const emptyEvaluationIcon = (
  <svg
    className="h-8 w-8"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="3" width="16" height="18" rx="2" ry="2" />
    <path d="M9 7h6" />
    <path d="M9 11h6" />
    <path d="M9 15h4" />
  </svg>
)

export interface ProfileViewProps {
  profile: any
  isOwnProfile: boolean
  parentProfile?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

interface Evaluation {
  id: string
  notes: string | null
  created_at: string
  price?: number | null
  share_token?: string | null
  view_count?: number | null
  scout_id?: string | null
  player_id?: string | null
  scout?: {
    id: string
    user_id?: string | null
    full_name: string | null
    avatar_url: string | null
    organization: string | null
    username: string | null
  } | null
  player?: {
    id: string
    user_id?: string | null
    full_name: string | null
    avatar_url: string | null
    school: string | null
    graduation_year: number | null
    username: string | null
  } | null
}

export default function ProfileView({ profile, isOwnProfile, parentProfile }: ProfileViewProps) {
  const [requesting, setRequesting] = useState(false)
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [showMoreInfo, setShowMoreInfo] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [minimizedEvals, setMinimizedEvals] = useState<Set<string>>(new Set())
  const [isHydrated, setIsHydrated] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [showSignUpModal, setShowSignUpModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup')
  const [bioExpanded, setBioExpanded] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'about' | 'offers' | 'posts' | 'evaluations' | 'blogs'>('about')
  const [serviceType, setServiceType] = useState<'services' | 'products'>('services')
  const [posts, setPosts] = useState<any[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [blogs, setBlogs] = useState<any[]>([])
  const [blogsLoading, setBlogsLoading] = useState(false)
  const [videoSize, setVideoSize] = useState<{ width: number; height: number } | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [videoWatched, setVideoWatched] = useState(false)
  const [followerCount, setFollowerCount] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const profileAvatarUrl = isMeaningfulAvatar(profile.avatar_url) ? profile.avatar_url : null
  const profilePath = getProfilePath(profile.id, profile.username)
  const appUrl =
    (process.env.NEXT_PUBLIC_APP_URL || 'https://got1.app').replace(/\/$/, '')
  const fullProfileUrl = `${appUrl}${profilePath}`
  const displayProfileUrl = `${appUrl.replace(/^https?:\/\//, '')}${profilePath}`
  const profileGradientKey =
    profile.user_id || profile.id || profile.username || profile.full_name || 'profile'

  const handleCopyProfileUrl = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullProfileUrl)
      } else {
        const tempInput = document.createElement('textarea')
        tempInput.value = fullProfileUrl
        tempInput.setAttribute('readonly', '')
        tempInput.style.position = 'absolute'
        tempInput.style.left = '-9999px'
        document.body.appendChild(tempInput)
        tempInput.select()
        document.execCommand('copy')
        document.body.removeChild(tempInput)
      }
      setCopyStatus('copied')
      window.setTimeout(() => setCopyStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to copy profile link:', error)
      setCopyStatus('error')
      window.setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }

  
  const toggleEvalMinimize = (evalId: string) => {
    setMinimizedEvals(prev => {
      const newSet = new Set(prev)
      if (newSet.has(evalId)) {
        newSet.delete(evalId)
      } else {
        newSet.add(evalId)
      }
      return newSet
    })
  }
  
  // Test accounts that should show the badge
  const testAccountNames = ['russell westbrooks', 'ray lewois', 'ella k']
  
  const isTestAccount = (fullName: string | null) => {
    if (!fullName) return false
    return testAccountNames.includes(fullName.toLowerCase())
  }

  // Calculate video size to fit viewport
  const calculateVideoSize = (videoWidth: number, videoHeight: number) => {
    if (!containerRef.current) return null

    const containerRect = containerRef.current.getBoundingClientRect()
    const availableWidth = containerRect.width || window.innerWidth * 0.9
    const availableHeight = window.innerHeight * 0.7

    const videoAspectRatio = videoWidth / videoHeight
    const containerAspectRatio = availableWidth / availableHeight

    let width: number
    let height: number

    if (videoAspectRatio > containerAspectRatio) {
      width = availableWidth
      height = width / videoAspectRatio
    } else {
      height = availableHeight
      width = height * videoAspectRatio
    }

    return { width, height }
  }

  // Handle video loaded to calculate size that fits viewport
  const handleVideoLoaded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget
    if (video.videoWidth && video.videoHeight) {
      const size = calculateVideoSize(video.videoWidth, video.videoHeight)
      if (size) {
        setVideoSize(size)
        video.style.width = `${size.width}px`
        video.style.height = `${size.height}px`
      }
    }
  }

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      if (videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
        const size = calculateVideoSize(videoRef.current.videoWidth, videoRef.current.videoHeight)
        if (size && videoRef.current) {
          setVideoSize(size)
          videoRef.current.style.width = `${size.width}px`
          videoRef.current.style.height = `${size.height}px`
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [profile.intro_video_url])

  // Check if video has been watched (from localStorage)
  useEffect(() => {
    if (profile.intro_video_url && profile.id) {
      const watchedKey = `intro-video-watched-${profile.id}`
      const watched = localStorage.getItem(watchedKey) === 'true'
      setVideoWatched(watched)
    }
  }, [profile.intro_video_url, profile.id])

  // Handle video play on modal open - must be called directly from user interaction for iOS
  const handleOpenVideoModal = async () => {
    setShowVideoModal(true)
    // For iOS, we need to trigger play directly in the click handler
    // Wait for next tick to ensure modal is rendered
    await new Promise(resolve => setTimeout(resolve, 50))
    if (videoRef.current) {
      // Try to play - iOS requires this to be in the user interaction chain
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Autoplay may fail, user can still click play button
          console.log('Autoplay prevented:', error)
        })
      }
    }
  }

  // Handle video end to mark as watched
  const handleVideoEnd = () => {
    if (profile.intro_video_url && profile.id) {
      const watchedKey = `intro-video-watched-${profile.id}`
      localStorage.setItem(watchedKey, 'true')
      setVideoWatched(true)
    }
  }

  // Get current user ID and profile
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setCurrentUserId(session.user.id)
        setIsSignedIn(true)
        
        // Load current user's profile for purchase evaluation
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()
        
        setCurrentUserProfile(userProfile)
      } else {
        setIsSignedIn(false)
        setCurrentUserProfile(null)
      }
    }
    getCurrentUser()
  }, [])

  // Load posts when Posts tab is active (for scouts) or always for players (PlayerTabs manages its own state)
  useEffect(() => {
    if (!profile.user_id) return
    
    const shouldLoadPosts = profile.role === 'scout' 
      ? activeTab === 'posts'  // For scouts, only load when posts tab is active
      : true                    // For players, always load (PlayerTabs manages visibility)
    
    if (shouldLoadPosts) {
      const loadPosts = async () => {
        setPostsLoading(true)
        try {
          console.log('🔍 Loading posts for user_id:', profile.user_id)
          const response = await fetch(`/api/posts/user/${profile.user_id}`)
          console.log('📡 Response status:', response.status)
          if (response.ok) {
            const data = await response.json()
            console.log('✅ Posts data received:', data)
            console.log('📝 Number of posts:', data.posts?.length || 0)
            setPosts(data.posts || [])
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error('❌ Error loading posts:', response.status, errorData)
            setPosts([])
          }
        } catch (error) {
          console.error('❌ Error loading posts:', error)
          setPosts([])
        } finally {
          setPostsLoading(false)
        }
      }
      loadPosts()
    }
  }, [activeTab, profile.user_id, profile.role])

  // Load blogs when Blogs tab is active
  useEffect(() => {
    if (!profile.user_id || profile.role !== 'scout') return
    
    if (activeTab === 'blogs') {
      const loadBlogs = async () => {
        setBlogsLoading(true)
        try {
          const supabase = createClient()
          const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('scout_id', profile.user_id)
            .order('pinned', { ascending: false, nullsFirst: false })
            .order('published_at', { ascending: false })
            .order('created_at', { ascending: false })

          if (error) throw error
          setBlogs(data || [])
        } catch (error) {
          console.error('Error loading blogs:', error)
          setBlogs([])
        } finally {
          setBlogsLoading(false)
        }
      }
      loadBlogs()
    }
  }, [activeTab, profile.user_id, profile.role])

  // Load evaluations when Evaluations tab is active
  useEffect(() => {
    if (profile.role === 'scout' && activeTab === 'evaluations') {
      loadEvaluations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, profile.role, profile.user_id])

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsHydrated(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    loadEvaluations()
  }, [profile.id, profile.role])

  // Load follower count
  useEffect(() => {
    const loadFollowerCount = async () => {
      if (!profile.user_id) return
      
      try {
        const response = await fetch(`/api/follows/count?userId=${profile.user_id}`)
        const result = await response.json()
        
        if (response.ok && result.followerCount !== undefined) {
          setFollowerCount(result.followerCount)
        }
      } catch (err) {
        console.error('Error loading follower count:', err)
      }
    }
    
    loadFollowerCount()
    
    // Listen for follow status changes to update follower count
    const handleFollowChange = (event: CustomEvent) => {
      if (event.detail.userId === profile.user_id) {
        // Reload follower count when someone follows/unfollows
        loadFollowerCount()
      }
    }
    
    window.addEventListener('follow-status-changed', handleFollowChange as EventListener)
    return () => {
      window.removeEventListener('follow-status-changed', handleFollowChange as EventListener)
    }
  }, [profile.user_id])

  // Track profile view (only for external views, not own profile)
  useEffect(() => {
    if (!isOwnProfile && profile.id) {
      // Use localStorage to track unique views per day
      const today = new Date().toDateString()
      const viewKey = `profile_view_${profile.id}_${today}`
      
      // Check if we've already tracked a view today
      if (typeof window !== 'undefined' && !localStorage.getItem(viewKey)) {
        // Track the view
        fetch(`/api/profile/${profile.id}/track-view`, {
          method: 'POST',
        }).catch(console.error)
        
        // Mark as viewed today
        localStorage.setItem(viewKey, 'true')
      }
    }
  }, [profile.id, isOwnProfile])

  /**
   * Loads evaluations for the current profile and manually joins profile data.
   * Since evaluations reference auth.users, we need to manually join with profiles.
   */
  const loadEvaluations = async () => {
    try {
      setLoading(true)
      
      // First, get the evaluations (including share_token for sharing if column exists)
      let evaluationsData
      let evaluationsError
      
      try {
        // Try with share_token first
        let query = supabase
          .from('evaluations')
          .select('id, notes, created_at, scout_id, player_id, share_token, price, view_count')

        if (profile.role === 'player') {
          // Get evaluations received by this player
          query = query.eq('player_id', profile.user_id).eq('status', 'completed')
        } else {
          // Get evaluations contributed by this scout
          query = query.eq('scout_id', profile.user_id).eq('status', 'completed')
        }

        query = query.order('created_at', { ascending: false })

        const result = await query
        evaluationsData = result.data
        evaluationsError = result.error

        // If error is due to share_token column not existing, try without it
        if (evaluationsError && (evaluationsError.code === '42703' || evaluationsError.message?.includes('column "share_token" does not exist'))) {
          console.warn('share_token column not found, fetching without it')
          let queryWithoutToken = supabase
            .from('evaluations')
            .select('id, notes, created_at, scout_id, player_id, price, view_count')

          if (profile.role === 'player') {
            queryWithoutToken = queryWithoutToken.eq('player_id', profile.user_id).eq('status', 'completed')
          } else {
            queryWithoutToken = queryWithoutToken.eq('scout_id', profile.user_id).eq('status', 'completed')
          }

          const resultWithoutToken = await queryWithoutToken.order('created_at', { ascending: false })
          evaluationsData = resultWithoutToken.data
          evaluationsError = resultWithoutToken.error
          
          // Add share_token as null if column doesn't exist
          if (evaluationsData) {
            evaluationsData = evaluationsData.map((e: any) => ({ ...e, share_token: null }))
          }
        }
      } catch (error) {
        console.error('Error loading evaluations:', error)
        evaluationsError = error as any
      }

      if (evaluationsError && evaluationsError.code !== '42703') {
        throw evaluationsError
      }

      if (!evaluationsData || evaluationsData.length === 0) {
        setEvaluations([])
        return
      }

      // Get unique user IDs from evaluations
      const userIds = new Set<string>()
      evaluationsData.forEach((evaluation) => {
        if (evaluation.scout_id) userIds.add(evaluation.scout_id)
        if (evaluation.player_id) userIds.add(evaluation.player_id)
      })

      // Fetch profiles for those user IDs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, organization, school, graduation_year, username')
        .in('user_id', Array.from(userIds))

      if (profilesError) throw profilesError

      // Manually join evaluations with profiles
      const evaluationsWithProfiles = evaluationsData.map((evaluation) => {
        const scoutProfile = profilesData?.find((p) => p.user_id === evaluation.scout_id) || null
        const playerProfile = profilesData?.find((p) => p.user_id === evaluation.player_id) || null

        return {
          id: evaluation.id,
          notes: evaluation.notes,
          created_at: evaluation.created_at,
          scout_id: evaluation.scout_id,
          player_id: evaluation.player_id,
          price: evaluation.price || 0,
          view_count: evaluation.view_count,
          share_token: evaluation.share_token,
          scout: scoutProfile ? {
            id: scoutProfile.id,
            user_id: scoutProfile.user_id,
            full_name: scoutProfile.full_name,
            avatar_url: scoutProfile.avatar_url,
            organization: scoutProfile.organization,
            username: scoutProfile.username,
          } : null,
          player: playerProfile ? {
            id: playerProfile.id,
            user_id: playerProfile.user_id,
            full_name: playerProfile.full_name,
            avatar_url: playerProfile.avatar_url,
            school: playerProfile.school,
            graduation_year: playerProfile.graduation_year,
            username: playerProfile.username,
          } : null,
        }
      })

      // Sort evaluations by price: free first (price = 0), then lowest to highest
      evaluationsWithProfiles.sort((a, b) => {
        const priceA = a.price || 0
        const priceB = b.price || 0
        // Free evals (price = 0) come first
        if (priceA === 0 && priceB !== 0) return -1
        if (priceA !== 0 && priceB === 0) return 1
        // Then sort by price ascending
        return priceA - priceB
      })

      setEvaluations(evaluationsWithProfiles as Evaluation[])
    } catch (error) {
      console.error('Error loading evaluations:', error)
      setEvaluations([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handles the request to purchase an evaluation from this scout.
   * Redirects to the purchase page if signed in, or shows sign-up modal if not.
   */
  const handleRequestEvaluation = async () => {
    if (!profile || profile.role !== 'scout') return

    // Check if user is signed in
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      // Show sign-up modal instead of redirecting
      setAuthMode('signup')
      setShowSignUpModal(true)
      return
    }

    setRequesting(true)
    router.push(`/profile/${profile.id}/purchase`)
    setRequesting(false)
  }

  /**
   * Handles scout giving a free evaluation to a player.
   * Creates a free evaluation and navigates to the evaluation detail page.
   */
  const handleGiveFreeEval = async () => {
    if (!profile || profile.role !== 'player') return
    if (!currentUserProfile || currentUserProfile.role !== 'scout') return

    try {
      setRequesting(true)
      
      const response = await fetch('/api/evaluation/give-free', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: profile.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create free evaluation')
      }

      // Navigate to the evaluation detail page
      if (data.evaluationId) {
        router.push(`/evaluations/${data.evaluationId}`)
      }
    } catch (error: any) {
      console.error('Error giving free evaluation:', error)
      alert(error.message || 'Failed to create free evaluation. Please try again.')
    } finally {
      setRequesting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    })
  }

  // Helper function to find college match for team logo
  const findCollegeMatch = useCallback((organization: string | null) => {
    if (!organization) return null
    const normalized = organization.toLowerCase().trim()
    const normalizedSimple = normalized.replace(/[^a-z0-9]/g, '')
    
    return (
      collegeEntries.find((college) => college.name.toLowerCase() === normalized) ||
      collegeEntries.find((college) => normalized === college.name.toLowerCase().replace('university of ', '') && college.division === 'FBS') ||
      collegeEntries.find((college) => normalized.includes(college.name.toLowerCase())) ||
      collegeEntries.find((college) => college.name.toLowerCase().includes(normalized)) ||
      collegeEntries.find((college) => normalizedSimple === college.name.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
      collegeEntries.find((college) => normalizedSimple.includes(college.name.toLowerCase().replace(/[^a-z0-9]/g, '')))
    )
  }, [])

  if (!isHydrated) {
    return (
      <div className="max-w-4xl mx-auto">
        <ProfileSkeletonPage />
      </div>
    )
  }

  if (profile.role === 'player') {
    // Player View
    return (
      <div className="max-w-4xl mx-auto">
        {isSignedIn && (
          <div className="mb-4 md:mb-6">
            <BackButton fallbackUrl="/browse" />
          </div>
        )}

        {/* Player Profile Section */}
        <div className="relative flex flex-row flex-wrap md:flex-nowrap items-start gap-3 md:gap-4 mb-4 md:mb-6 bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5 md:p-6">
          <div className="flex flex-col items-start gap-2 flex-shrink-0">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden">
              {profileAvatarUrl && !imageErrors.has(`profile-${profile.id}`) ? (
                <Image
                  src={profileAvatarUrl}
                  alt={profile.full_name || 'Player'}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  onError={() => {
                    setImageErrors((prev) => new Set(prev).add(`profile-${profile.id}`))
                  }}
                  priority
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${getGradientForId(profileGradientKey)}`}>
                  <span className="text-white text-2xl font-semibold">
                    {profile.full_name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 w-full text-left flex items-center">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-1 mb-1">
                <h1 className="text-lg md:text-xl font-bold text-black break-words">
                  {profile.full_name || 'Unknown Player'}
                </h1>
                {isTestAccount(profile.full_name) && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded flex-shrink-0 whitespace-nowrap">
                    test account
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-gray-600 mb-1">
                {profile.username && <span className="text-gray-500">@{profile.username}</span>}
                {!isOwnProfile && <span className="text-gray-400">•</span>}
                {!isOwnProfile && (
                  <button
                    onClick={() => setShowMoreInfo(true)}
                    className="interactive-press text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    Details
                  </button>
                )}
              </div>
              <div className="mb-1.5">
                <p className="text-xs md:text-sm text-blue-600 flex flex-wrap items-center gap-1">
                  {profile.school && (
                    <>
                      <span>{profile.school}</span>
                      {profile.state && <span>, {profile.state}</span>}
                      {profile.classification && <span> ({profile.classification})</span>}
                    </>
                  )}
                  {(() => {
                    let positions: string[] = []
                    try {
                      // Try to load from positions JSONB array first (new format)
                      if (profile.positions && typeof profile.positions === 'string') {
                        positions = JSON.parse(profile.positions)
                      } else if (Array.isArray(profile.positions)) {
                        positions = profile.positions
                      } else if (profile.position) {
                        // Fall back to single position field (backward compatibility)
                        positions = [profile.position]
                      }
                    } catch {
                      // If parsing fails, fall back to single position
                      if (profile.position) {
                        positions = [profile.position]
                      }
                    }
                    
                    if (positions.length > 0) {
                      return (
                        <>
                          {(profile.school || profile.state || profile.classification) && (
                            <span className="text-gray-400">•</span>
                          )}
                          <span>{positions.join(', ')}</span>
                        </>
                      )
                    }
                    return null
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* For unauthenticated users viewing player profiles: Show only profile card + blurred evaluations */}
        {!isSignedIn ? (
          <div className="mb-6 md:mb-8 mt-6 md:mt-8 relative min-h-[400px]">
            {/* Blurred background content */}
            <div className="filter blur-md pointer-events-none opacity-50">
              {loading ? (
                <EvaluationListSkeleton />
              ) : evaluations.length > 0 ? (
                <div className="space-y-6">
                  {evaluations.slice(0, 3).map((evaluation) => (
                    <div key={evaluation.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6">
                      <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6">
                  <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Sign in overlay - centered and properly positioned */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl border border-gray-300 p-6 md:p-8 max-w-md mx-4 text-center z-10">
                <h3 className="text-xl md:text-2xl font-bold text-black mb-3">
                  Sign in to view evaluations
                </h3>
                <p className="text-gray-600 mb-6">
                  Create an account or sign in to see detailed evaluations
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setShowSignUpModal(true)
                      setAuthMode('signup')
                    }}
                    className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => {
                      setShowSignUpModal(true)
                      setAuthMode('signin')
                    }}
                    className="flex-1 px-6 py-3 bg-gray-100 text-black rounded-lg hover:bg-gray-200 font-medium transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Player Tabs - Show for signed-in users or all scout profiles */
          <PlayerTabs
          playerInfoContent={
            <>
              {/* Player Stats Section */}
              {(profile.gpa || profile.weight || profile.height || profile.forty_yard_dash || 
                profile.bench_max || profile.squat_max || profile.clean_max) && (
                <div className="surface-card mb-6 md:mb-8 p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-bold text-black mb-4 md:mb-6">Athletic Information</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {profile.gpa && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">GPA</p>
                        <p className="text-lg md:text-xl font-semibold text-black">{profile.gpa.toFixed(2)}</p>
                      </div>
                    )}
                    {profile.height && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Height</p>
                        <p className="text-lg md:text-xl font-semibold text-black">{profile.height}</p>
                      </div>
                    )}
                    {profile.weight && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Weight</p>
                        <p className="text-lg md:text-xl font-semibold text-black">{profile.weight} lbs</p>
                      </div>
                    )}
                    {profile.forty_yard_dash && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">40-Yard Dash</p>
                        <p className="text-lg md:text-xl font-semibold text-black">{profile.forty_yard_dash.toFixed(2)}s</p>
                      </div>
                    )}
                    {profile.bench_max && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Bench Max</p>
                        <p className="text-lg md:text-xl font-semibold text-black">{profile.bench_max} lbs</p>
                      </div>
                    )}
                    {profile.squat_max && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Squat Max</p>
                        <p className="text-lg md:text-xl font-semibold text-black">{profile.squat_max} lbs</p>
                      </div>
                    )}
                    {profile.clean_max && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Clean Max</p>
                        <p className="text-lg md:text-xl font-semibold text-black">{profile.clean_max} lbs</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Parent Information Section */}
              {profile.role === 'player' && parentProfile && parentProfile.id && (
                <div className="surface-card mb-6 md:mb-8 p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-bold text-black mb-4 md:mb-6">Parent Information</h2>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      {parentProfile.avatar_url && isMeaningfulAvatar(parentProfile.avatar_url) ? (
                        <Image
                          src={parentProfile.avatar_url}
                          alt={parentProfile.full_name || 'Parent'}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${getGradientForId(parentProfile.id || 'default')}`}>
                          <span className="text-white text-lg font-semibold">
                            {parentProfile.full_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-black">{parentProfile.full_name || 'Parent'}</p>
                      <p className="text-sm text-gray-600">Managing this player profile</p>
                    </div>
                  </div>
                </div>
              )}

              {/* College Offers Section */}
              <div className="mb-6 md:mb-8">
                <PlayerOffersSection
                  profileId={profile.id}
                  userId={profile.user_id}
                  isOwnProfile={isOwnProfile}
                />
              </div>

              {/* Give Eval Button - Only visible to scouts viewing player profiles */}
              {!isOwnProfile && 
               isSignedIn && 
               currentUserProfile?.role === 'scout' && 
               profile.role === 'player' && (
                <div className="mb-6 md:mb-8">
                  <button
                    onClick={handleGiveFreeEval}
                    disabled={requesting}
                    className="interactive-press w-full px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 font-semibold text-sm md:text-base transition-colors disabled:active:scale-100"
                  >
                    {requesting ? 'Creating...' : 'Give eval'}
                  </button>
                </div>
              )}
            </>
          }
          postsContent={
            <div>
              {postsLoading ? (
                <div className="text-center py-12 text-gray-500">Loading posts...</div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No posts yet
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
          }
          postsCount={posts.length}
          evaluationsContent={
            <div className="mb-6 md:mb-8 relative">
              {loading ? (
                <EvaluationListSkeleton />
              ) : evaluations.length === 0 && isSignedIn ? (
                <EmptyState
                  icon={emptyEvaluationIcon}
                  title="No evaluations yet"
                  description={
                    isOwnProfile
                      ? 'Request an evaluation from a scout to see it appear here.'
                      : 'This player has not received any public evaluations yet.'
                  }
                  action={
                    isOwnProfile ? (
                      <Link
                        href="/discover"
                        className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                      >
                        Browse scouts
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7M4 12h12" />
                        </svg>
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <div className="relative">
                  <div className={`space-y-6 ${!isSignedIn ? 'filter blur-md' : ''}`}>
                    {isSignedIn ? (
                      evaluations.map((evaluation) => {
                        const scoutAvatarUrl = isMeaningfulAvatar(evaluation.scout?.avatar_url)
                          ? evaluation.scout?.avatar_url ?? undefined
                          : undefined
                        const scoutGradientKey =
                          evaluation.scout?.user_id ||
                          evaluation.scout_id ||
                          evaluation.scout?.id ||
                          evaluation.scout?.username ||
                          evaluation.id
                        const showScoutAvatar =
                          Boolean(scoutAvatarUrl) && !imageErrors.has(`scout-${evaluation.id}`)

                        return (
                          <div key={evaluation.id} className="border-b border-gray-200 pb-4 md:pb-6 last:border-0">
                            <Link 
                              href={`/evaluations/${evaluation.id}`}
                              className="block"
                            >
                              <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4 hover:opacity-90 transition-opacity cursor-pointer">
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0">
                                  {showScoutAvatar ? (
                                    <Image
                                      src={scoutAvatarUrl!}
                                      alt={evaluation.scout?.full_name || 'Scout'}
                                      width={64}
                                      height={64}
                                      className="w-full h-full object-cover"
                                      onError={() => {
                                        setImageErrors((prev) => new Set(prev).add(`scout-${evaluation.id}`))
                                      }}
                                      unoptimized
                                    />
                                  ) : (
                                    <div className={`w-full h-full flex items-center justify-center ${getGradientForId(scoutGradientKey)}`}>
                                      <span className="text-white text-xl font-semibold">
                                        {evaluation.scout?.full_name?.charAt(0).toUpperCase() || '?'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-black text-base md:text-lg truncate">
                                      {evaluation.scout?.full_name || 'Unknown Scout'}
                                    </h3>
                                    {evaluation.price === 0 && (
                                      <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded flex-shrink-0">
                                        Free
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-black text-xs md:text-sm mb-1 truncate">
                                    {evaluation.scout?.organization || 'Scout'}
                                  </p>
                                  <p className="text-black text-xs md:text-sm text-gray-600">
                                    {formatDate(evaluation.created_at)}
                                  </p>
                                </div>
                                {evaluation.notes && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      toggleEvalMinimize(evaluation.id)
                                    }}
                                    className="flex-shrink-0 text-gray-500 hover:text-black transition-colors p-1"
                                    title={minimizedEvals.has(evaluation.id) ? 'Expand' : 'Minimize'}
                                  >
                                    <svg
                                      className={`w-5 h-5 transition-transform ${minimizedEvals.has(evaluation.id) ? '' : 'rotate-180'}`}
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
                                )}
                              </div>
                              {evaluation.notes && !minimizedEvals.has(evaluation.id) && (
                                <div className="pl-0 md:pl-20 mt-4 md:mt-0">
                                  <p className="text-black leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                                    {evaluation.notes}
                                  </p>
                                </div>
                              )}
                            </Link>
                            {/* Footer Row: Likes/Comments on left, Share/Download on right */}
                            <div className="pl-0 md:pl-20 mt-4 md:mt-2">
                              <EvaluationFooter evaluationId={evaluation.id} />
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <EvaluationListSkeleton />
                    )}
                  </div>
                  {/* Sign in/Sign up overlay for non-signed-in users */}
                  {!isSignedIn && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-40 backdrop-blur-[2px]">
                      <div className="bg-white rounded-lg shadow-xl border border-gray-300 p-6 md:p-8 max-w-md mx-4 text-center">
                        <h3 className="text-xl md:text-2xl font-bold text-black mb-3">
                          Sign in to view evaluations
                        </h3>
                        <p className="text-gray-600 mb-6">
                          Create an account or sign in to see detailed evaluations
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Link
                            href="/auth/signup"
                            className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
                          >
                            Sign Up
                          </Link>
                          <Link
                            href="/auth/signin"
                            className="flex-1 px-6 py-3 bg-gray-100 text-black rounded-lg hover:bg-gray-200 font-medium transition-colors"
                          >
                            Sign In
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          }
          evaluationsCount={evaluations.length}
          />
        )}

        {/* More Info Modal */}
        {showMoreInfo && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4" 
            onClick={() => setShowMoreInfo(false)}
          >
            <div 
              className="surface-card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in p-4 md:p-6" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-xl md:text-2xl font-bold text-black">
                  More Information
                </h3>
                <button
                  onClick={() => setShowMoreInfo(false)}
                  className="interactive-press text-gray-500 hover:text-black text-2xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              
              <div className='space-y-5 md:space-y-6'>
                {profile.bio && (
                  <div>
                    <h4 className="text-base md:text-lg font-semibold text-black mb-2">Bio</h4>
                    <p className="text-sm md:text-base text-black leading-relaxed whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  </div>
                )}
                
                {profile.hudl_link && (
                  <div>
                    <h4 className="text-base md:text-lg font-semibold text-black mb-2">Hudl Profile</h4>
                    <a
                      href={profile.hudl_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm md:text-base text-blue-600 hover:underline break-words"
                    >
                      {profile.hudl_link.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                
                {profile.social_link && (
                  <div>
                    <h4 className="text-base md:text-lg font-semibold text-black mb-2">Social</h4>
                    <a
                      href={profile.social_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm md:text-base text-blue-600 hover:underline break-words"
                    >
                      {profile.social_link.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                
                {(!profile.bio && !profile.hudl_link && !profile.social_link) && (
                  <p className="text-sm md:text-base text-gray-500">No additional information available.</p>
                )}
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => setShowMoreInfo(false)}
                  className="interactive-press w-full px-6 py-3 border border-gray-300 bg-white text-black rounded-full hover:bg-gray-50 font-medium text-sm md:text-base transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Scout/Pro View
  const isUnclaimed = profile.profile_claimed === false
  const collegeMatch = findCollegeMatch(profile.organization)
  const jobTitle = profile.position && profile.organization
    ? `${profile.position} at ${profile.organization}`
    : profile.position || profile.organization || 'Football Expert'

  return (
    <div className="max-w-6xl mx-auto relative">
      {isSignedIn && (
        <div className="mb-4 md:mb-6 relative z-30" style={{ pointerEvents: 'auto' }}>
          <BackButton fallbackUrl="/browse" />
        </div>
      )}

      {/* Main Layout: Left Sidebar + Right Purchase */}
      <div className={`flex flex-col ${profile.role === 'scout' ? '' : 'md:flex-row'} gap-6 md:gap-8 mb-8`}>
        {/* Left Sidebar - Profile Info */}
        <div className={profile.role === 'scout' ? 'w-full' : 'md:w-80 flex-shrink-0'}>
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6 relative">
            {/* Share Menu Button - Top Right inside profile card */}
            {!isOwnProfile && (
              <div className="absolute top-4 right-4 z-10">
                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="More options"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  {showShareMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowShareMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                        <button
                          onClick={async () => {
                            await handleCopyProfileUrl()
                            // Don't close menu immediately - show feedback first
                            setTimeout(() => {
                              setShowShareMenu(false)
                            }, 2000)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors relative"
                        >
                          {copyStatus === 'copied' ? (
                            <>
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-green-600 font-medium">Copied!</span>
                            </>
                          ) : copyStatus === 'error' ? (
                            <>
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span className="text-red-600">Failed</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                              Share profile
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (!isSignedIn) {
                              router.push('/auth/signin')
                              setShowShareMenu(false)
                              return
                            }
                            setShowShareMenu(false)
                            setShowReportModal(true)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Report profile
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Profile Picture and Name/Role - Horizontal Layout */}
            <div className="flex items-start gap-4">
              {/* Scout Profile Picture - Large with video indicator ring */}
              <div className="flex-shrink-0">
                {profile.intro_video_url ? (
                  <button
                    onClick={handleOpenVideoModal}
                    className="relative group cursor-pointer"
                    aria-label="View intro video"
                  >
                    <div className={`w-20 h-20 rounded-full p-1 transition-colors ${
                      videoWatched ? 'ring-2 ring-gray-400' : 'ring-2 ring-blue-600'
                    }`}>
                      <div className="w-full h-full rounded-full overflow-hidden">
                        {profileAvatarUrl && !imageErrors.has(`profile-${profile.id}`) ? (
                          <Image
                            src={profileAvatarUrl}
                            alt={profile.full_name || 'Scout'}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                            onError={() => {
                              setImageErrors((prev) => new Set(prev).add(`profile-${profile.id}`))
                            }}
                            priority
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center text-3xl font-semibold text-white ${getGradientForId(profileGradientKey)}`}>
                            {profile.full_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </button>
                ) : (
                  <div className="w-20 h-20 rounded-full overflow-hidden">
                    {profileAvatarUrl && !imageErrors.has(`profile-${profile.id}`) ? (
                      <Image
                        src={profileAvatarUrl}
                        alt={profile.full_name || 'Scout'}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                        onError={() => {
                          setImageErrors((prev) => new Set(prev).add(`profile-${profile.id}`))
                        }}
                        priority
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-3xl font-semibold text-white ${getGradientForId(profileGradientKey)}`}>
                        {profile.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Role + Team */}
              <div className="flex-1 text-left h-20 flex flex-col justify-between">
                <div className="flex items-center justify-start gap-2">
                  <h1 className="text-xl font-bold text-black leading-tight">
                    {profile.full_name || 'Unknown Scout'}
                  </h1>
                  <VerificationBadge className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600 leading-tight">{jobTitle}</p>
                
                {/* Third row: Organization + Role Tag */}
                <div className="flex items-center justify-start gap-2 flex-wrap leading-tight">
                  {collegeMatch && (
                    <div className="flex items-center gap-2">
                      {collegeMatch.logo && (
                        <div className="w-4 h-4 rounded-full bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                          <Image
                            src={collegeMatch.logo}
                            alt={collegeMatch.name}
                            width={16}
                            height={16}
                            className="object-contain w-full h-full"
                            unoptimized
                          />
                        </div>
                      )}
                      <p className="text-sm text-gray-500">{collegeMatch.name}</p>
                    </div>
                  )}
                  {!isOwnProfile && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      profile.role === 'scout' 
                        ? 'bg-blue-100 text-blue-800' 
                        : profile.role === 'player'
                        ? 'bg-green-100 text-green-800'
                        : profile.role === 'parent'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {profile.role === 'scout' 
                        ? 'Scout' 
                        : profile.role === 'player'
                        ? 'Player'
                        : profile.role === 'parent'
                        ? 'Parent'
                        : 'Basic User'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* View Count Row with Edit Profile Button / Follow Button */}
            <div className="text-sm text-gray-600 flex items-center gap-3 flex-wrap">
              {isOwnProfile ? (
                <a
                  href="/profile/edit"
                  className="interactive-press inline-flex items-center px-3 py-1.5 bg-gray-200 text-black rounded-lg hover:bg-gray-300 font-medium text-sm"
                >
                  Edit Profile
                </a>
              ) : isSignedIn ? (
                <FollowButton userId={profile.user_id} className="px-3 py-1.5 text-sm" />
              ) : null}
              <div className="flex items-center gap-3">
                {(profile.view_count ?? 0) > 0 && (
                  <>
                    <span>{(profile.view_count ?? 0).toLocaleString()} {(profile.view_count ?? 0) === 1 ? 'view' : 'views'}</span>
                    {followerCount !== null && <span>•</span>}
                  </>
                )}
                {followerCount !== null && (
                  <span>{followerCount.toLocaleString()} {followerCount === 1 ? 'follower' : 'followers'}</span>
                )}
              </div>
            </div>

            {/* Divider Line - Only show for non-scouts */}
            {profile.role !== 'scout' && (
              <div className="border-t border-gray-200"></div>
            )}

            {/* Work History, Additional Info, and Social Media - Only show for non-scouts */}
            {profile.role !== 'scout' && (
              <>
                {/* Work History */}
                {profile.work_history && (
                  <div>
                    <h3 className="text-sm font-semibold text-black mb-2">Work History</h3>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {profile.work_history}
                    </p>
                  </div>
                )}

                {/* Additional Info */}
                {profile.additional_info && (
                  <div>
                    <h3 className="text-sm font-semibold text-black mb-2">Additional Information</h3>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {profile.additional_info}
                    </p>
                  </div>
                )}

                {/* Social Media Links */}
                {profile.social_link && (
                  <div>
                    <h3 className="text-sm font-semibold text-black mb-2">Social Media</h3>
                    <a
                      href={profile.social_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                    >
                      {profile.social_link.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Side - Only show for non-scouts or own profile */}
        {profile.role !== 'scout' && (
          <div className="flex-1">
            {isOwnProfile ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-gray-600">This is your profile.</p>
              </div>
            ) : isUnclaimed ? (
              <JoinWaitlist 
                scoutId={profile.id} 
                scoutName={profile.full_name || 'This scout'} 
              />
            ) : null}
          </div>
        )}
      </div>

      {/* Tabs - Only show for scouts (players use PlayerTabs) */}
      {profile.role === 'scout' && (
        <div className="mb-6 md:mb-8">
          <div className="-mx-4 md:mx-0 px-4 md:px-0 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 md:gap-4 border-b border-gray-200 min-w-full">
              <button
                onClick={() => setActiveTab('about')}
                className={`interactive-press flex-1 md:flex-initial flex-shrink-0 px-2 md:px-4 py-2 font-medium text-xs md:text-base transition-colors ${
                  activeTab === 'about'
                    ? 'bg-gray-100 border-b-2 border-black text-black'
                    : 'text-black hover:bg-gray-50'
                } flex flex-col md:flex-row items-center gap-1 md:gap-2`}
              >
                <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden md:inline">About</span>
                <span className="md:hidden text-[10px] leading-tight">About</span>
              </button>
              <button
                onClick={() => setActiveTab('evaluations')}
                className={`interactive-press flex-1 md:flex-initial flex-shrink-0 px-2 md:px-4 py-2 font-medium text-xs md:text-base transition-colors ${
                  activeTab === 'evaluations'
                    ? 'bg-gray-100 border-b-2 border-black text-black'
                    : 'text-black hover:bg-gray-50'
                } flex flex-col md:flex-row items-center gap-1 md:gap-2`}
              >
                <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden md:inline">Evaluations</span>
                <span className="md:hidden text-[10px] leading-tight">Evals</span>
              </button>
              <button
                onClick={() => setActiveTab('offers')}
                className={`interactive-press flex-1 md:flex-initial flex-shrink-0 px-2 md:px-4 py-2 font-medium text-xs md:text-base transition-colors ${
                  activeTab === 'offers'
                    ? 'bg-gray-100 border-b-2 border-black text-black'
                    : 'text-black hover:bg-gray-50'
                } flex flex-col md:flex-row items-center gap-1 md:gap-2`}
              >
                <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="hidden md:inline">Purchase</span>
                <span className="md:hidden text-[10px] leading-tight">Buy</span>
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`interactive-press flex-1 md:flex-initial flex-shrink-0 px-2 md:px-4 py-2 font-medium text-xs md:text-base transition-colors ${
                  activeTab === 'posts'
                    ? 'bg-gray-100 border-b-2 border-black text-black'
                    : 'text-black hover:bg-gray-50'
                } flex flex-col md:flex-row items-center gap-1 md:gap-2`}
              >
                <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden md:inline">Posts</span>
                <span className="md:hidden text-[10px] leading-tight">Posts</span>
              </button>
              <button
                onClick={() => setActiveTab('blogs')}
                className={`interactive-press flex-1 md:flex-initial flex-shrink-0 px-2 md:px-4 py-2 font-medium text-xs md:text-base transition-colors ${
                  activeTab === 'blogs'
                    ? 'bg-gray-100 border-b-2 border-black text-black'
                    : 'text-black hover:bg-gray-50'
                } flex flex-col md:flex-row items-center gap-1 md:gap-2`}
              >
                <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="hidden md:inline">Blogs</span>
                <span className="md:hidden text-[10px] leading-tight">Blogs</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content - Only show for scouts (players use PlayerTabs) */}
      {profile.role === 'scout' && (
        <div className="mb-6 md:mb-8">
          {activeTab === 'about' && (
            <div className="space-y-6">
              {/* Work History */}
              {profile.work_history && (
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-black mb-3">Work History</h3>
                  <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {profile.work_history}
                  </p>
                </div>
              )}

              {/* Additional Info */}
              {profile.additional_info && (
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-black mb-3">Additional Information</h3>
                  <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {profile.additional_info}
                  </p>
                </div>
              )}

              {/* Social Media Links */}
              {profile.social_link && (
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-black mb-3">Social Media</h3>
                  <a
                    href={profile.social_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm md:text-base text-blue-600 hover:text-blue-800 underline break-all"
                  >
                    {profile.social_link.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}

              {!profile.work_history && !profile.additional_info && !profile.social_link && (
                <div className="text-center py-12 text-gray-500">
                  No additional information available
                </div>
              )}
            </div>
          )}
          {activeTab === 'offers' && (
            <div className="space-y-6">
              {/* Service Type Tabs - Show for others */}
              {!isOwnProfile && (
                <>
                  <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                    <button
                      onClick={() => setServiceType('services')}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        serviceType === 'services'
                          ? 'bg-gray-100 text-black'
                          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Services
                    </button>
                    <button
                      onClick={() => setServiceType('products')}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        serviceType === 'products'
                          ? 'bg-gray-100 text-black'
                          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Products
                    </button>
                  </div>

                  {/* Services Tab Content */}
                  {serviceType === 'services' && (
                    <PurchaseEvaluation 
                      scout={profile} 
                      player={currentUserProfile?.role === 'player' ? currentUserProfile : null}
                      isSignedIn={isSignedIn}
                      onSignInClick={() => {
                        setShowSignUpModal(true)
                        setAuthMode('signin')
                      }}
                      onSignUpClick={() => {
                        setShowSignUpModal(true)
                        setAuthMode('signup')
                      }}
                    />
                  )}

                  {/* Products Tab Content */}
                  {serviceType === 'products' && (
                    <div className="text-center py-12 text-gray-500">
                      Products coming soon
                    </div>
                  )}
                </>
              )}
              
              {/* Own Profile - Show Eval Offers Preview */}
              {isOwnProfile && profile.role === 'scout' && (() => {
                // Count number of offers: 1 if only standard, 2 if both free and standard
                const hasFreeEval = profile.free_eval_enabled && profile.free_eval_description
                const offerCount = hasFreeEval ? 2 : 1
                return (
                  <div className={offerCount === 1 ? 'space-y-6 flex flex-col items-start' : 'w-full flex flex-col md:flex-row md:gap-6 space-y-6 md:space-y-0'}>
                    {/* Free Evaluation Offer */}
                    {profile.free_eval_enabled && profile.free_eval_description && (
                      <div className="flex-1 border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h2 className="text-lg font-semibold text-black">Free Evaluation</h2>
                        <a
                          href="/profile"
                          className="interactive-press px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300 text-center font-medium text-sm"
                        >
                          Edit
                        </a>
                      </div>
                      <div className="mb-6">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {profile.free_eval_description}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-6">
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-black">Evaluation Service</span>
                              <span className="font-bold text-black">$0.00</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Standard Evaluation Offer */}
                  <div className="flex-1 border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h2 className="text-lg font-semibold text-black">
                        {profile.offer_title || 'Standard Evaluation'}
                      </h2>
                      <a
                        href="/profile"
                        className="interactive-press px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300 text-center font-medium text-sm"
                      >
                        Edit
                      </a>
                    </div>
                    
                    {profile.bio && (
                      <div className="mb-6">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {profile.bio}
                        </p>
                      </div>
                    )}

                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <div className="space-y-4">
                        {/* Price and Turnaround Time */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-black">Evaluation Service</span>
                            <span className="font-bold text-black">
                              ${(profile.price_per_eval || 99).toFixed(2)}
                            </span>
                          </div>
                          {profile.turnaround_time && (
                            <p className="text-sm text-gray-600">
                              {profile.turnaround_time.includes('after scout confirmation') || profile.turnaround_time.includes('from scout confirmation')
                                ? profile.turnaround_time.replace('from scout confirmation', 'after scout confirmation')
                                : `${profile.turnaround_time} after scout confirmation`}
                            </p>
                          )}
                        </div>

                        {/* Positions */}
                        {(() => {
                          let positions: string[] = []
                          if (profile.positions && typeof profile.positions === 'string') {
                            try {
                              positions = JSON.parse(profile.positions)
                            } catch {
                              positions = [profile.positions]
                            }
                          } else if (Array.isArray(profile.positions)) {
                            positions = profile.positions
                          } else if (profile.position) {
                            positions = [profile.position]
                          }
                          return positions.length > 0 ? (
                            <div>
                              <span className="text-sm font-medium text-black block mb-2">Positions: </span>
                              <div className="flex flex-wrap gap-2">
                                {positions.map((pos: string, idx: number) => (
                                  <span 
                                    key={idx}
                                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                                  >
                                    {pos}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null
                        })()}

                        {/* College Connections */}
                        {(() => {
                          let connections: string[] = []
                          if (profile.college_connections) {
                            try {
                              if (typeof profile.college_connections === 'string') {
                                const parsed = JSON.parse(profile.college_connections)
                                connections = Array.isArray(parsed) ? parsed : Object.values(parsed)
                              } else if (Array.isArray(profile.college_connections)) {
                                connections = profile.college_connections
                              }
                            } catch {
                              // If parsing fails, skip
                            }
                          }
                          
                          if (connections.length > 0) {
                            const connectionColleges = connections
                              .map(slug => collegeEntries.find(c => c.slug === slug))
                              .filter(Boolean)
                            
                            return connectionColleges.length > 0 ? (
                              <div>
                                <span className="text-sm font-medium text-black block mb-2">Connections: </span>
                                <div className="flex flex-wrap gap-2">
                                  {connectionColleges.map((college) => (
                                    <div key={college!.slug} className="flex items-center gap-1.5 px-2 py-1 bg-white rounded border border-gray-200">
                                      {college!.logo && (
                                        <Image
                                          src={college!.logo}
                                          alt={college!.name}
                                          width={16}
                                          height={16}
                                          className="object-contain"
                                          unoptimized
                                        />
                                      )}
                                      <span className="text-xs text-gray-700">{college!.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null
                          }
                          return null
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                  )
                })()}
              
              {/* Why Valuable, What to Expect, FAQ - Show only for external scout profile views */}
              {!isOwnProfile && (
                <ScoutProfileSections scoutName={profile.full_name || 'This scout'} isSignedIn={isSignedIn} />
              )}
            </div>
          )}
          {activeTab === 'posts' && (
            <div>
              {postsLoading ? (
                <div className="text-center py-12 text-gray-500">Loading posts...</div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No posts yet
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'blogs' && (
            <div>
              {blogsLoading ? (
                <div className="text-center py-12 text-gray-500">Loading blogs...</div>
              ) : blogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No blog posts yet
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {blogs.map((blog) => (
                    <Link
                      key={blog.id}
                      href={`/blog/${blog.slug}`}
                      className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow relative group"
                    >
                      {/* Pinned Indicator */}
                      {blog.pinned && (
                        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-xs text-gray-600">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                          </svg>
                          <span>Pinned</span>
                        </div>
                      )}
                      {/* Header Image */}
                      <div className="relative w-full h-48 overflow-hidden bg-gray-100">
                        <Image
                          src={blog.image}
                          alt={blog.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                      </div>
                      <div className="p-6">
                        <h3 className="text-lg font-medium text-black mb-2 group-hover:text-blue-600 transition-colors">
                          {blog.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{blog.excerpt}</p>
                        <div className="text-xs text-gray-500">
                          {new Date(blog.published_at || blog.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'evaluations' && (
            <div>
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading evaluations...</div>
              ) : evaluations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No evaluations available yet
                </div>
              ) : (
                <div className="space-y-4">
                  {evaluations.map((evaluation) => {
                    const playerAvatarUrl = isMeaningfulAvatar(evaluation.player?.avatar_url)
                      ? evaluation.player?.avatar_url ?? undefined
                      : undefined
                    const playerGradientKey =
                      evaluation.player?.user_id ||
                      evaluation.player_id ||
                      evaluation.player?.id ||
                      evaluation.player?.username ||
                      evaluation.id
                    const showPlayerAvatar =
                      Boolean(playerAvatarUrl) && !imageErrors.has(`player-eval-${evaluation.id}`)

                    const playerProfilePath = evaluation.player?.id 
                      ? getProfilePath(evaluation.player.id, evaluation.player.username)
                      : null
                    // Add 'from' parameter based on profile role
                    const fromParam = profile.role === 'scout' ? 'scout' : 'player'
                    const evaluationPath = `/evaluations/${evaluation.id}?from=${fromParam}`

                    const isMinimized = minimizedEvals.has(evaluation.id)
                    const evaluationPrice = evaluation.price || 0

                    return (
                      <div key={evaluation.id} className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="border-b border-gray-200 pb-4 md:pb-6 mb-4 md:mb-6">
                          <div className="flex items-start justify-between mb-3 md:mb-4">
                            <Link
                              href={playerProfilePath || evaluationPath}
                              className="flex items-start gap-3 md:gap-4 flex-1 min-w-0 hover:opacity-90 transition-opacity"
                            >
                              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0">
                                {showPlayerAvatar ? (
                                  <Image
                                    src={playerAvatarUrl!}
                                    alt={evaluation.player?.full_name || 'Player'}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                    onError={() => {
                                      setImageErrors((prev) => new Set(prev).add(`player-eval-${evaluation.id}`))
                                    }}
                                    unoptimized
                                  />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center ${getGradientForId(playerGradientKey)}`}>
                                    <span className="text-white text-xl font-semibold">
                                      {evaluation.player?.full_name?.charAt(0).toUpperCase() || '?'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 h-12 md:h-16 flex flex-col justify-between">
                                <h3 className="font-bold text-black text-base md:text-lg truncate">
                                  {evaluation.player?.full_name || 'Unknown Player'}
                                </h3>
                                <p className="text-black text-xs md:text-sm truncate">
                                  {evaluation.player?.school || 'Unknown School'}
                                  {evaluation.player?.school && evaluation.player?.graduation_year && ', '}
                                  {evaluation.player?.graduation_year && `${evaluation.player.graduation_year}`}
                                </p>
                                <p className="text-black text-xs md:text-sm text-gray-600 truncate">
                                  {new Date(evaluation.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </Link>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                              {/* Price */}
                              <span className="text-base md:text-lg font-bold text-black whitespace-nowrap">
                                ${evaluationPrice.toFixed(2)}
                              </span>
                              {/* Minimize/Expand Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleEvalMinimize(evaluation.id)
                                }}
                                className="interactive-press p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                                aria-label={isMinimized ? 'Expand' : 'Minimize'}
                                title={isMinimized ? 'Expand' : 'Minimize'}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                  className={`w-5 h-5 transition-transform ${isMinimized ? '' : 'rotate-180'}`}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          {evaluation.notes && !isMinimized && (
                            <Link
                              href={evaluationPath}
                              className="block pl-0 md:pl-20 mt-4 md:mt-0 hover:opacity-90 transition-opacity"
                            >
                              <p className="text-black leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                                {evaluation.notes}
                              </p>
                            </Link>
                          )}
                          {/* Footer Row: Likes/Comments on left, Share/Download on right */}
                          {!isMinimized && (
                            <div className="pl-0 md:pl-20 mt-6">
                              <EvaluationFooter evaluationId={evaluation.id} />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}


      {/* More Info Modal */}
      {showMoreInfo && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4" 
          onClick={() => setShowMoreInfo(false)}
        >
          <div 
            className="surface-card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in p-4 md:p-6" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-black">
                More Information
              </h3>
              <button
                onClick={() => setShowMoreInfo(false)}
                className="interactive-press text-gray-500 hover:text-black text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className='space-y-5 md:space-y-6'>
              {profile.work_history && (
                <div>
                  <h4 className="text-base md:text-lg font-semibold text-black mb-2">Work History</h4>
                  <p className="text-sm md:text-base text-black leading-relaxed whitespace-pre-wrap">
                    {profile.work_history}
                  </p>
                </div>
              )}
              
              {profile.additional_info && (
                <div>
                  <h4 className="text-base md:text-lg font-semibold text-black mb-2">Additional Information</h4>
                  <p className="text-sm md:text-base text-black leading-relaxed whitespace-pre-wrap">
                    {profile.additional_info}
                  </p>
                </div>
              )}
              
              {profile.bio && (
                <div>
                  <h4 className="text-base md:text-lg font-semibold text-black mb-2">Bio</h4>
                  <p className="text-sm md:text-base text-black leading-relaxed whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </div>
              )}
              
              {profile.social_link && (
                <div>
                  <h4 className="text-base md:text-lg font-semibold text-black mb-2">Social</h4>
                  <a
                    href={profile.social_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm md:text-base text-blue-600 hover:underline break-words"
                  >
                    {profile.social_link.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              
              {profile.price_per_eval && (
                <div>
                  <h4 className="text-base md:text-lg font-semibold text-black mb-2">Price per Evaluation</h4>
                  <p className="text-sm md:text-base text-black font-medium">${profile.price_per_eval}</p>
                </div>
              )}
              
              {profile.turnaround_time && (
                <div>
                  <h4 className="text-base md:text-lg font-semibold text-black mb-2">Turnaround Time</h4>
                  <p className="text-sm md:text-base text-black font-medium">{profile.turnaround_time}</p>
                </div>
              )}
              
              {(!profile.work_history && !profile.additional_info && !profile.bio && !profile.price_per_eval && !profile.turnaround_time && !profile.social_link) && (
                <p className="text-sm md:text-base text-gray-500">No additional information available.</p>
              )}
            </div>
            
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {!isOwnProfile && profile.role === 'scout' && (
                <button
                  onClick={() => {
                    setShowMoreInfo(false)
                    handleRequestEvaluation()
                  }}
                  disabled={requesting}
                  className="interactive-press flex-1 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 font-semibold text-sm md:text-base transition-colors disabled:active:scale-100"
                >
                  {requesting ? 'Processing...' : `Purchase Evaluation - $${profile.price_per_eval || '99'}`}
                </button>
              )}
              <button
                onClick={() => setShowMoreInfo(false)}
                className={`interactive-press px-6 py-3 border border-gray-300 bg-white text-black rounded-full hover:bg-gray-50 font-medium text-sm md:text-base transition-colors ${!isOwnProfile ? 'flex-1 sm:flex-initial' : 'w-full'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How It Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowHowItWorks(false)}>
          <div className="bg-white rounded-lg p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-2xl font-bold text-black">
                How Upfront Payments Work
              </h3>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="interactive-press text-gray-500 hover:text-black text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className='space-y-6'>
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-1">Pay Upfront to Secure Your Spot</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      Tap "Request & Pay Now" to jump straight into secure Stripe checkout. Got1 charges the full amount immediately and holds it in escrow until the scout delivers. Cancel anytime before the scout confirms for an instant full refund.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-1">Scout Confirms or Declines</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      The scout reviews your paid request. <strong>If they confirm:</strong> they lock in the work and start the evaluation. <strong>If they decline:</strong> Got1 automatically refunds 100% of your payment back to your card right away.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-1">Scout Delivers</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      The scout finishes your evaluation within their turnaround time. When they submit, the payment is released from escrow—90% goes to the scout and Got1 retains a 10% platform fee. We’ll email you the finished evaluation immediately.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="surface-card-muted mt-6 p-4">
                <h4 className="font-semibold text-black mb-2">Refund Policy</h4>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>✅ Cancel before the scout confirms for an instant full refund</li>
                  <li>✅ If the scout denies your request, we automatically refund you in full</li>
                  <li>🚫 Once the scout confirms, the evaluation is locked in (reach out to support for exceptional circumstances)</li>
                  <li>💡 Your payment stays in escrow until the scout finishes the evaluation</li>
                </ul>
              </div>
            </div>
            
            <button
              onClick={() => setShowHowItWorks(false)}
              className="interactive-press w-full mt-6 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      )}


      {/* Report Profile Modal */}
      <Modal 
        isOpen={showReportModal} 
        onClose={() => {
          setShowReportModal(false)
          setReportReason('')
          setIsSubmittingReport(false)
          setReportSuccess(false)
        }} 
        title="Report Profile"
      >
        {reportSuccess ? (
          <div className="space-y-4">
            <p className="text-black leading-relaxed">
              Thanks for letting us know. Our team will review this profile and take the appropriate action.
            </p>
            <button
              onClick={() => {
                setShowReportModal(false)
                setReportSuccess(false)
                setReportReason('')
              }}
              className="interactive-press w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-black leading-relaxed">
              You are reporting <strong>{profile.full_name || 'this profile'}</strong>{profile.role ? ` (${profile.role})` : ''}. This sends a message to the Got1 team to review their activity.
            </p>
            <div className="space-y-2">
              <label htmlFor="report-reason" className="text-sm font-semibold text-black">Reason (optional)</label>
              <textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Share any details that can help our team review this profile..."
                className="w-full min-h-[120px] border border-gray-300 rounded-lg p-3 text-black focus:outline-none focus:ring-2 focus:ring-black"
                maxLength={2000}
              />
              <p className="text-xs text-gray-500">Usernames and links are helpful if you have them.</p>
            </div>
            <button
              onClick={async () => {
                try {
                  setIsSubmittingReport(true)
                  const response = await fetch('/api/report/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profileId: profile.id, reason: reportReason }),
                  })

                  if (!response.ok) {
                    const data = await response.json().catch(() => ({}))
                    throw new Error(data.error || 'Failed to submit report. Please try again.')
                  }

                  setReportSuccess(true)
                } catch (error: any) {
                  alert(error.message || 'Failed to submit report. Please try again.')
                } finally {
                  setIsSubmittingReport(false)
                }
              }}
              disabled={isSubmittingReport}
              className="interactive-press w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors disabled:opacity-60 disabled:active:scale-100"
            >
              {isSubmittingReport ? 'Sending...' : 'Send Report'}
            </button>
          </div>
        )}
      </Modal>

      {/* Sign Up Modal for non-authenticated users */}
      <AuthModal
        isOpen={showSignUpModal}
        onClose={() => {
          setShowSignUpModal(false)
          setAuthMode('signup')
        }}
        mode={authMode}
        onModeChange={(newMode) => {
          setAuthMode(newMode)
        }}
      />

      {/* Video Modal */}
      {showVideoModal && profile.intro_video_url && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in p-4" 
          onClick={() => setShowVideoModal(false)}
        >
          <div 
            className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 text-2xl font-bold transition-colors"
              aria-label="Close video"
            >
              ×
            </button>
            <div ref={containerRef} className="w-full flex justify-center">
              <video
                ref={videoRef}
                src={profile.intro_video_url}
                poster={profile.intro_video_poster_url || undefined}
                controls
                playsInline
                // @ts-ignore - webkit-playsinline for older iOS
                webkit-playsinline="true"
                preload="auto"
                onLoadedMetadata={(e) => {
                  handleVideoLoaded(e)
                  // Try to play after metadata loads (iOS compatibility)
                  if (videoRef.current) {
                    videoRef.current.play().catch((error) => {
                      console.log('Autoplay after load prevented:', error)
                    })
                  }
                }}
                onEnded={handleVideoEnd}
                onPlay={() => {
                  // Video is playing
                }}
                onClick={(e) => {
                  // Ensure video plays when user clicks on video element (iOS)
                  e.stopPropagation()
                  if (videoRef.current && videoRef.current.paused) {
                    videoRef.current.play().catch((error) => {
                      console.log('Play failed:', error)
                    })
                  }
                }}
                className="rounded-lg"
                style={{ 
                  display: 'block',
                  ...(videoSize ? {
                    width: `${videoSize.width}px`,
                    height: `${videoSize.height}px`
                  } : {
                    maxWidth: '100%'
                  })
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}