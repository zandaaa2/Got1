export type UserRole = 'user' | 'player' | 'scout' | 'parent'

export interface Profile {
  id: string
  user_id: string
  role: UserRole
  full_name: string | null
  avatar_url: string | null
  username: string
  created_at: string
  updated_at: string
  profile_claimed?: boolean | null
  scout_category?: 'pro' | 'd1-college' | 'smaller-college' | null
  bio?: string | null
  credentials?: string | null
}

export interface PlayerProfile extends Profile {
  role: 'player'
  hudl_link: string | null
  position: string | null
  school: string | null
  graduation_year: number | null
  parent_name: string | null
}

export interface ScoutProfile extends Profile {
  role: 'scout'
  bio: string | null
  credentials: string | null
  organization: string | null
  price_per_eval?: number
  username: string
  social_link: string | null
  turnaround_time: string | null
  profile_claimed?: boolean | null
  scout_category?: 'pro' | 'd1-college' | 'smaller-college' | null
  offer_title?: string | null
  intro_video_url?: string | null
}

export interface ParentProfile extends Profile {
  role: 'parent'
}

export interface ParentChild {
  id: string
  parent_id: string
  player_id: string
  created_at: string
}

export interface Evaluation {
  id: string
  scout_id: string
  player_id: string
  status: 'requested' | 'confirmed' | 'denied' | 'cancelled' | 'in_progress' | 'completed'
  price: number
  notes: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  payment_status?: 'pending' | 'paid' | 'refunded' | null
  payment_intent_id?: string | null
  stripe_account_id?: string | null
  transfer_id?: string | null
  platform_fee?: number | null
  scout_payout?: number | null
  confirmed_at?: string | null
  denied_at?: string | null
  denied_reason?: string | null
  cancelled_at?: string | null
  cancelled_reason?: string | null
  purchased_by?: string | null
  purchased_by_type?: 'player' | 'parent' | null
}

export interface ScoutApplication {
  id: string
  user_id: string
  current_workplace: string
  current_position: string
  work_history: string
  additional_info: string | null
  status: 'pending' | 'approved' | 'denied'
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

