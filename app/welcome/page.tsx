import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import WelcomeContent from '@/components/welcome/WelcomeContent'
import WelcomeNavbar from '@/components/welcome/WelcomeNavbar'
import StructuredData from '@/components/welcome/StructuredData'
import { collegeEntries } from '@/lib/college-data'
import { getAllBlogPosts } from '@/lib/blog-posts'
import type { Metadata } from 'next'

// Helper function to match organization name to college slug
function findCollegeSlugByOrganization(organization: string | null): string | null {
  if (!organization) return null
  
  const normalized = organization.toLowerCase().trim()
  const normalizedSimple = normalized.replace(/[^a-z0-9]/g, '')
  
  const match = collegeEntries.find((college) => {
    const collegeName = college.name.toLowerCase()
    const collegeSimple = collegeName.replace(/[^a-z0-9]/g, '')
    
    return (
      collegeName === normalized ||
      normalized === collegeName.replace('university of ', '') ||
      collegeName.includes(normalized) ||
      normalized.includes(collegeName) ||
      collegeSimple === normalizedSimple ||
      collegeSimple.includes(normalizedSimple) ||
      normalizedSimple.includes(collegeSimple)
    )
  })
  
  return match?.slug || null
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://got1.app'
  
  return {
    title: 'Got1 - Get Professional Football Evaluations from Verified College Scouts',
    description: 'Connect with verified college football scouts from top programs. Get professional game film evaluations, recruiting feedback, and expert insights to advance your football career. Fast turnaround, guaranteed quality.',
    keywords: [
      'college football recruiting',
      'football evaluation',
      'verified college scouts',
      'game film analysis',
      'football recruiting platform',
      'college scout feedback',
      'high school football recruiting',
      'football player evaluation',
      'college football scouting',
      'recruiting evaluation service',
      'football recruiting help',
      'college football connections',
      'football recruiting advice',
      'verified scouts',
      'professional football evaluation'
    ],
    alternates: {
      canonical: '/welcome',
    },
    openGraph: {
      title: 'Got1 - Professional Football Evaluations from Verified College Scouts',
      description: 'Get expert game film evaluations from verified college scouts. Fast feedback, guaranteed quality. Connect with scouts from top programs like Michigan, Auburn, and more.',
      url: `${baseUrl}/welcome`,
      siteName: 'Got1',
      images: [
        { 
          url: `${baseUrl}/social/og-default.png?v=2`, 
          width: 1200, 
          height: 630, 
          alt: 'Got1 - Professional Football Evaluations from Verified College Scouts' 
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Got1 - Professional Football Evaluations',
      description: 'Get expert game film evaluations from verified college scouts. Fast feedback, guaranteed quality.',
      images: [`${baseUrl}/social/og-default.png?v=2`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

export default async function WelcomePage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is signed in, redirect to discover page
  if (session) {
    redirect('/discover')
  }

  // Fetch ALL scouts (including those without scout_category) to get all connections
  // We need to get connections from all scouts, not just those with categories
  const { data: allScoutsForConnections } = await supabase
    .from('profiles')
    .select('id, college_connections, organization')
    .eq('role', 'scout')
    .not('college_connections', 'is', null)
    .limit(1000)

  // Fetch all scouts (with and without categories) for the scouts section
  const { data: allScoutsForSection, error: allScoutsError } = await supabase
    .from('profiles')
    .select('id, user_id, username, full_name, organization, position, avatar_url, bio, credentials, scout_category, price_per_eval, suspended_until, stripe_account_id, college_connections')
    .eq('role', 'scout')
    .order('created_at', { ascending: false })
  
  if (allScoutsError) {
    console.error('[Welcome Page] Error fetching scouts for section:', allScoutsError)
  }
  
  // Debug: Log query results
  if (process.env.NODE_ENV === 'development') {
    console.log('[Welcome Page] allScoutsForSection count:', allScoutsForSection?.length || 0)
  }

  // Also fetch scouts with categories for the rest of the page
  const { data: allScouts } = await supabase
    .from('profiles')
    .select('id, user_id, username, full_name, organization, position, avatar_url, bio, credentials, scout_category, price_per_eval, suspended_until, stripe_account_id, college_connections')
    .eq('role', 'scout')
    .not('scout_category', 'is', null)
    .order('created_at', { ascending: false })

  // Extract all college connection slugs from ALL scouts
  // Combine both queries to get maximum connections (some scouts might have connections but no category)
  const allCollegeConnectionSlugs = new Set<string>()
  
  // Combine scouts from both queries, prioritizing the one with full data
  const scoutsToProcess = new Map<string, any>()
  
  // First add scouts with full data (has category)
  allScouts?.forEach(scout => {
    if (scout.id) scoutsToProcess.set(scout.id, scout)
  })
  
  // Then add scouts with connections (may not have category)
  allScoutsForConnections?.forEach(scout => {
    if (scout.id && !scoutsToProcess.has(scout.id)) {
      scoutsToProcess.set(scout.id, scout)
    }
  })
  
  // Process all unique scouts
  for (const scout of Array.from(scoutsToProcess.values())) {
    // Extract from college_connections field
    const connections = scout.college_connections
    
    if (connections) {
      try {
        let slugs: string[] = []
        
        // Handle all possible formats from Supabase JSONB
        if (Array.isArray(connections)) {
          // Already an array - this is most common when JSONB is auto-parsed
          slugs = connections
        } else if (typeof connections === 'string') {
          // String format - need to parse JSON (this is how it's saved: JSON.stringify())
          try {
            const parsed = JSON.parse(connections)
            if (Array.isArray(parsed)) {
              slugs = parsed
            } else if (parsed && typeof parsed === 'object') {
              // Handle object format
              slugs = Object.values(parsed).filter(v => typeof v === 'string') as string[]
            }
          } catch {
            // Not valid JSON, might be a single slug
            if (connections.trim()) {
              slugs = [connections.trim()]
            }
          }
        } else if (connections && typeof connections === 'object') {
          // Object but not array
          slugs = Object.values(connections).filter(v => typeof v === 'string') as string[]
        }
        
        // Add all valid slugs
        slugs.forEach(slug => {
          if (typeof slug === 'string' && slug.trim()) {
            allCollegeConnectionSlugs.add(slug.trim())
          }
        })
      } catch (e) {
        // Continue to next scout if error
      }
    }
    
    // ALSO use organization as additional source of connections
    // This ensures we show connections even if college_connections field isn't set
    if (scout.organization) {
      const orgSlug = findCollegeSlugByOrganization(scout.organization)
      if (orgSlug) {
        allCollegeConnectionSlugs.add(orgSlug)
      }
    }
  }
  
  const uniqueCollegeConnectionSlugs = Array.from(allCollegeConnectionSlugs)

  // Filter out suspended scouts for category sections
  const now = new Date()
  const activeScouts = (allScouts || []).filter(scout => {
    if (scout.suspended_until && typeof scout.suspended_until === 'string') {
      return new Date(scout.suspended_until) <= now
    }
    return true
  })

  // Filter out suspended scouts for the scouts section (all scouts)
  const activeAllScouts = (allScoutsForSection || []).filter(scout => {
    if (scout.suspended_until && typeof scout.suspended_until === 'string') {
      return new Date(scout.suspended_until) <= now
    }
    return true
  })
  
  // Debug: Log filtering results
  if (process.env.NODE_ENV === 'development') {
    console.log('[Welcome Page] activeAllScouts count after filtering:', activeAllScouts.length)
    if (activeAllScouts.length === 0 && (allScoutsForSection?.length || 0) > 0) {
      console.warn('[Welcome Page] All scouts were filtered out as suspended!')
    }
  }

  // Get top scouts with Stripe set up (unique offers) - prioritize those with stripe_account_id
  // Always show at least some scouts even if none have Stripe
  const scoutsWithStripe = activeScouts.filter(s => 
    s.stripe_account_id !== null && 
    s.stripe_account_id !== undefined && 
    s.stripe_account_id !== ''
  )
  
  // Prioritize scouts with Stripe, but always show at least 3 if available
  let topScouts = []
  if (scoutsWithStripe.length >= 3) {
    topScouts = scoutsWithStripe.slice(0, 3)
  } else if (scoutsWithStripe.length > 0) {
    const scoutsWithoutStripe = activeScouts.filter(s => 
      !s.stripe_account_id || 
      s.stripe_account_id === null || 
      s.stripe_account_id === ''
    )
    topScouts = [...scoutsWithStripe, ...scoutsWithoutStripe].slice(0, 3)
  } else {
    // Fallback: show first 3 active scouts if no Stripe accounts
    topScouts = activeScouts.slice(0, 3)
  }

  // Group scouts by category
  const proScouts = activeScouts.filter(s => s.scout_category === 'pro')
  const d1Scouts = activeScouts.filter(s => s.scout_category === 'd1-college')
  const d2Scouts = activeScouts.filter(s => s.scout_category === 'smaller-college')

  // Fetch profile avatars for trust section
  const { data: profileAvatarsRaw } = await supabase
    .from('profiles')
    .select('id, avatar_url, full_name')
    .not('avatar_url', 'is', null)
    .neq('avatar_url', '')
    .limit(10)
  
  // Filter to only include meaningful avatars (not placeholder URLs)
  const { isMeaningfulAvatar } = await import('@/lib/avatar')
  const profileAvatars = profileAvatarsRaw
    ?.filter((p) => isMeaningfulAvatar(p.avatar_url))
    .slice(0, 5) || []

  // Fetch completed evaluations for the examples section
  // Since evaluations reference auth.users, we need to manually join with profiles
  const { data: evaluationsData } = await supabase
    .from('evaluations')
    .select('id, notes, completed_at, scout_id, player_id')
    .eq('status', 'completed')
    .not('notes', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(6)

  // Manually join with profiles
  let exampleEvaluations: any[] = []
  if (evaluationsData && evaluationsData.length > 0) {
    const userIds = [
      ...evaluationsData.map(e => e.scout_id),
      ...evaluationsData.map(e => e.player_id)
    ].filter(Boolean) as string[]

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, user_id, username, full_name, avatar_url, organization, position, school, graduation_year')
      .in('user_id', userIds)

    exampleEvaluations = evaluationsData.map((evaluation) => ({
      ...evaluation,
      scout: profiles?.find((p) => p.user_id === evaluation.scout_id) || null,
      player: profiles?.find((p) => p.user_id === evaluation.player_id) || null,
    }))
  }

  // Fetch blog posts for the welcome page
  const blogPosts = await getAllBlogPosts()
  // Limit to 5 most recent blog posts
  const recentBlogPosts = blogPosts.slice(0, 5)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://got1.app'

  // Structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Got1',
    url: baseUrl,
    description: 'Professional football evaluations from verified college scouts',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/browse?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Got1',
    url: baseUrl,
    logo: `${baseUrl}/got1app.png`,
    description: 'Platform connecting high school football players with verified college scouts for professional game film evaluations',
    sameAs: [
      // Add social media URLs when available
    ],
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Got1?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Got1 is a college sports recruiting platform that connects high school athletes with verified college scouts. You can submit your game film for professional evaluations and receive actionable feedback to advance your recruiting. Our network includes scouts from top programs like Michigan, Auburn, and more.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I get scout feedback on my game film?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sign up as an athlete, create your profile, and submit your highlights or full game film. Verified scouts will review it and provide detailed, professional evaluations with strengths, areas for improvement, and recruiting potential. We guarantee valuable feedback or your money back.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are the scouts on Got1 verified and real college coaches?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes — every scout on Got1 is verified to ensure they\'re actively involved in college recruiting. We connect you with scouts from Power 5 and other programs, giving you authentic insights you can trust.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is Got1 free to use?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Creating an athlete or scout profile and browsing is free. Submitting film for evaluations may involve a fee, but we offer a quality guarantee: If the feedback isn\'t valuable, you get your money back.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does Got1 help with college recruiting?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Beyond evaluations, you can connect with scouts on X (formerly Twitter), build your network, and take actionable steps toward the right university. Many athletes use our feedback to improve their highlights and get noticed by college programs.',
        },
      },
      {
        '@type': 'Question',
        name: 'What sports does Got1 support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We focus primarily on football, with verified scouts evaluating positions like QB, WR, and more. We\'re expanding to other sports — contact us if you\'re in another discipline!',
        },
      },
      {
        '@type': 'Question',
        name: 'How private is my information on Got1?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Your full profile, film, and evaluations are private and only visible to verified scouts unless you choose otherwise. We prioritize privacy while helping you get exposure.',
        },
      },
    ],
  }

  return (
    <div className="min-h-screen bg-white">
      <StructuredData data={[structuredData, organizationSchema, faqSchema]} />
      <div className="relative">
        <WelcomeNavbar showBecomeScout={true} />
        <WelcomeContent 
          collegeConnectionSlugs={uniqueCollegeConnectionSlugs}
          topScouts={topScouts}
          proScouts={proScouts}
          d1Scouts={d1Scouts}
          d2Scouts={d2Scouts}
          profileAvatars={profileAvatars}
          exampleEvaluations={exampleEvaluations}
          blogPosts={recentBlogPosts}
        />
      </div>
    </div>
  )
}


