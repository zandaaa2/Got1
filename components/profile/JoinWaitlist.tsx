'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { useAuthModal } from '@/contexts/AuthModalContext'

interface JoinWaitlistProps {
  scoutId: string
  scoutName: string
}

export default function JoinWaitlist({ scoutId, scoutName }: JoinWaitlistProps) {
  const [loading, setLoading] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { openSignUp } = useAuthModal()

  const handleJoinWaitlist = async () => {
    // Check if user is signed in
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      openSignUp()
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get user's profile for name/email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, user_id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      const { data: { user } } = await supabase.auth.getUser()

      // Check if already on waitlist
      const { data: existing } = await supabase
        .from('scout_waitlist')
        .select('id')
        .eq('scout_profile_id', scoutId)
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (existing) {
        setJoined(true)
        setLoading(false)
        return
      }

      // Join waitlist
      const { error: insertError } = await supabase
        .from('scout_waitlist')
        .insert({
          scout_profile_id: scoutId,
          user_id: session.user.id,
          email: user?.email || null,
          full_name: profile?.full_name || user?.user_metadata?.full_name || null,
        })

      if (insertError) throw insertError

      setJoined(true)
    } catch (error: any) {
      console.error('Error joining waitlist:', error)
      setError(error.message || 'Failed to join waitlist. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (joined) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="flex items-center justify-center mb-3">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">You're on the waitlist!</h3>
        <p className="text-sm text-green-700">
          We'll notify you when {scoutName} claims their profile and starts accepting evaluations.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-black mb-2">Join Waitlist</h3>
        <p className="text-sm text-gray-600">
          This scout hasn't claimed their profile yet. Join the waitlist to be notified when they're ready to accept evaluations.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleJoinWaitlist}
        disabled={loading}
        className="w-full py-3 px-6 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Joining...' : 'Join Waitlist'}
      </button>
    </div>
  )
}


