import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import WelcomeContent from '@/components/welcome/WelcomeContent'
import WelcomeNavbar from '@/components/welcome/WelcomeNavbar'
import { collegeEntries } from '@/lib/college-data'

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
  for (const scout of scoutsToProcess.values()) {
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

  return (
    <div className="min-h-screen bg-white">
      <div className="relative">
        <WelcomeNavbar showBecomeScout={true} />
        <WelcomeContent 
          collegeConnectionSlugs={uniqueCollegeConnectionSlugs}
          topScouts={topScouts}
          proScouts={proScouts}
          d1Scouts={d1Scouts}
          d2Scouts={d2Scouts}
          profileAvatars={profileAvatars}
        />
      </div>
    </div>
  )
}


