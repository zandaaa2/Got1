'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'

interface Step3SelectRoleProps {
  profile: any
  onComplete: () => void
  onBack: () => void
}

export default function Step3SelectRole({ profile, onComplete, onBack }: Step3SelectRoleProps) {
  const [accountType, setAccountType] = useState<'player' | 'parent' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!accountType) {
      setError('Please select an account type')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('📝 Step3SelectRole - Attempting to update role:', {
        user_id: profile.user_id,
        currentRole: profile.role,
        newRole: accountType
      })

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ role: accountType })
        .eq('user_id', profile.user_id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error updating role in Step3:', updateError)
        console.error('❌ Error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        })
        
        // Check if it's a constraint violation
        if (updateError.code === '23514' || updateError.message?.includes('check constraint') || updateError.message?.includes('role')) {
          setError(`Database constraint error: The role '${accountType}' may not be allowed. Please contact support. Error: ${updateError.message}`)
        } else {
          setError(`Failed to update role: ${updateError.message || 'Unknown error'}. Please try again or contact support.`)
        }
        setLoading(false)
        return
      }

      if (!updatedProfile) {
        console.error('❌ Step3SelectRole - No profile returned after update')
        throw new Error('Profile update returned no data')
      }

      console.log('✅ Step 3 role updated successfully:', {
        user_id: profile.user_id,
        oldRole: profile.role,
        newRole: updatedProfile.role,
        accountType: accountType,
        match: updatedProfile.role === accountType
      })

      // Verify the role was actually saved
      if (updatedProfile.role !== accountType) {
        console.error('❌ Step3SelectRole - Role mismatch! Expected:', accountType, 'Got:', updatedProfile.role)
        setError(`Role update failed. Expected '${accountType}' but got '${updatedProfile.role}'. This may be a database constraint issue.`)
        setLoading(false)
        return
      }

      // Double-check by fetching the profile again to ensure it was saved
      console.log('🔍 Step3SelectRole - Verifying role was saved by fetching profile again...')
      const { data: verifiedProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', profile.user_id)
        .single()

      if (verifyError) {
        console.error('❌ Step3SelectRole - Error verifying role:', verifyError)
      } else {
        console.log('✅ Step3SelectRole - Verified role in database:', verifiedProfile?.role)
        if (verifiedProfile?.role !== accountType) {
          console.error('❌ Step3SelectRole - Verification failed! Role in DB:', verifiedProfile?.role, 'Expected:', accountType)
          setError(`Role verification failed. The role may not have been saved correctly.`)
          setLoading(false)
          return
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(`onboarding_accountType_${profile.user_id}`, accountType)
      }

      onComplete()
    } catch (err: any) {
      console.error('❌ Step3SelectRole error:', err)
      setError(err.message || 'Failed to update account type')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h3 className="text-lg font-bold text-black mb-2">Select Account Type</h3>
        <p className="text-gray-600 text-sm mb-4">
          Choose whether this account is for a player or a parent managing their child's profile.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setAccountType('player')}
          className={`p-6 rounded-lg border-2 text-left transition-all ${
            accountType === 'player'
              ? 'border-black bg-gray-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="font-bold text-black mb-2">Player</div>
          <div className="text-sm text-gray-600">
            This account is for a high school football player who will receive evaluations.
          </div>
        </button>

        <button
          onClick={() => setAccountType('parent')}
          className={`p-6 rounded-lg border-2 text-left transition-all ${
            accountType === 'parent'
              ? 'border-black bg-gray-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="font-bold text-black mb-2">Parent</div>
          <div className="text-sm text-gray-600">
            This account is for a parent managing their child's football profile and evaluations.
          </div>
        </button>
      </div>

      <div className="flex gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex-1 py-3 border border-gray-300 text-black rounded-lg font-medium hover:bg-gray-50"
          >
            Back
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!accountType || loading}
          className={`${onBack ? 'flex-1' : 'w-full'} py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}



