'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

interface Step3SelectRoleProps {
  profile: any
  onComplete: () => void
  onBack?: () => void
}

export default function Step3SelectRole({ profile, onComplete, onBack }: Step3SelectRoleProps) {
  const [accountType, setAccountType] = useState<'player' | 'parent' | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  // Update role immediately when user selects a role button
  const handleRoleSelect = async (selectedRole: 'player' | 'parent') => {
    setAccountType(selectedRole)
    setError(null)
    setSaving(true)

    try {
      console.log('📝 Step3SelectRole - Immediately updating role to:', {
        user_id: profile.user_id,
        currentRole: profile.role,
        newRole: selectedRole
      })

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('user_id', profile.user_id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error updating role in Step3:', updateError)
        setError(`Failed to update role: ${updateError.message || 'Unknown error'}`)
        setSaving(false)
        return
      }

      if (!updatedProfile) {
        console.error('❌ Step3SelectRole - No profile returned after update')
        setError('Failed to update role. Please try again.')
        setSaving(false)
        return
      }

      console.log('✅ Step 3 role updated immediately:', {
        user_id: profile.user_id,
        oldRole: profile.role,
        newRole: updatedProfile.role,
        selectedRole: selectedRole,
        match: updatedProfile.role === selectedRole
      })

      // Verify the role was actually saved
      if (updatedProfile.role !== selectedRole) {
        console.error('❌ Step3SelectRole - Role mismatch! Expected:', selectedRole, 'Got:', updatedProfile.role)
        setError(`Role update failed. Expected '${selectedRole}' but got '${updatedProfile.role}'.`)
        setSaving(false)
        return
      }

      // Save to localStorage for other steps
      if (typeof window !== 'undefined') {
        localStorage.setItem(`onboarding_accountType_${profile.user_id}`, selectedRole)
      }

      setSaving(false)
    } catch (err: any) {
      console.error('❌ Step3SelectRole error:', err)
      setError(err.message || 'Failed to update account type')
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!accountType) {
      setError('Please select an account type')
      return
    }

    // ALWAYS update the role when Continue is clicked - this ensures it's set correctly
    setLoading(true)
    setError(null)

    try {
      console.log('📝 Step3SelectRole - Submitting with role:', accountType, 'for user:', profile.user_id)
      
      // CRITICAL: Always update the role when submitting, regardless of previous state
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ role: accountType })
        .eq('user_id', profile.user_id)
        .select()
        .single()

        if (updateError) {
          console.error('❌ Error updating role on submit:', updateError)
          setError(`Failed to update role: ${updateError.message || 'Unknown error'}`)
          setLoading(false)
          return
        }

      if (!updatedProfile) {
        console.error('❌ Step3SelectRole - No profile returned after update on submit')
        setError('Failed to update role. Please try again.')
        setLoading(false)
        return
      }

      // Verify the role was actually saved correctly
      if (updatedProfile.role !== accountType) {
        console.error('❌ Step3SelectRole - Role mismatch on submit! Expected:', accountType, 'Got:', updatedProfile.role)
        setError(`Role update failed. Expected '${accountType}' but got '${updatedProfile.role}'.`)
        setLoading(false)
        return
      }

      console.log('✅ Step3SelectRole - Role successfully set to:', updatedProfile.role, 'for user:', profile.user_id)

      // Save to localStorage for other steps
      if (typeof window !== 'undefined') {
        localStorage.setItem(`onboarding_accountType_${profile.user_id}`, accountType)
      }

      onComplete()
    } catch (err: any) {
      console.error('❌ Step3SelectRole submit error:', err)
      setError(err.message || 'Failed to proceed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h3 className="text-lg font-bold text-black mb-2">Select Account Type</h3>
        <p className="text-gray-600 text-sm mb-4">
          Choose whether this account is for a player, a parent managing their child's profile, or a scout.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => handleRoleSelect('player')}
          disabled={saving}
          className={`p-6 rounded-lg border-2 text-left transition-all relative ${
            accountType === 'player'
              ? 'border-black bg-gray-50'
              : 'border-gray-200 hover:border-gray-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {accountType === 'player' && (
            <div className="absolute top-3 right-3">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <div className="font-bold text-black mb-2">Player</div>
          <div className="text-sm text-gray-600">
            This account is for a high school football player who will receive evaluations.
          </div>
          {saving && accountType === 'player' && (
            <div className="mt-2 text-xs text-gray-500">Saving...</div>
          )}
        </button>

        <button
          onClick={() => handleRoleSelect('parent')}
          disabled={saving}
          className={`p-6 rounded-lg border-2 text-left transition-all relative ${
            accountType === 'parent'
              ? 'border-black bg-gray-50'
              : 'border-gray-200 hover:border-gray-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {accountType === 'parent' && (
            <div className="absolute top-3 right-3">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <div className="font-bold text-black mb-2">Parent</div>
          <div className="text-sm text-gray-600">
            This account is for a parent managing their child's football profile and evaluations.
          </div>
          {saving && accountType === 'parent' && (
            <div className="mt-2 text-xs text-gray-500">Saving...</div>
          )}
        </button>

        <button
          onClick={() => {
            // Redirect to scout onboarding step 4
            router.push('/scout?step=4')
          }}
          className="p-6 rounded-lg border-2 text-left transition-all border-gray-200 hover:border-gray-300"
        >
          <div className="font-bold text-black mb-2">Scout</div>
          <div className="text-sm text-gray-600">
            This account is for a scout who will write evaluations for players.
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
          disabled={!accountType || loading || saving}
          className={`${onBack !== undefined ? 'flex-1' : 'w-full'} py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? 'Verifying...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}



