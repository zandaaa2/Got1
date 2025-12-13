'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/shared/Modal'
import { createClient } from '@/lib/supabase-client'

interface RoleConverterProps {
  currentRole: 'user' | 'player' | 'scout'
  hasPassword: boolean
  hasPendingApplication?: boolean
}

export default function RoleConverter({ currentRole, hasPassword: hasPasswordProp, hasPendingApplication = false }: RoleConverterProps) {
  const router = useRouter()
  const supabase = createClient()
  const [showModal, setShowModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'user' | 'player' | 'scout' | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPassword, setHasPassword] = useState(hasPasswordProp)

  // Check if user has password authentication (not just OAuth)
  useEffect(() => {
    const checkPasswordAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          // Check if user has email provider (which typically means password auth)
          // OAuth users will have 'google' or other providers
          const providers = session.user.app_metadata?.providers || []
          const hasEmailProvider = providers.includes('email')
          // If they have email provider and not just OAuth, they likely have a password
          setHasPassword(hasEmailProvider && !providers.includes('google'))
        }
      } catch (error) {
        console.error('Error checking password auth:', error)
        // Default to requiring password for security
        setHasPassword(true)
      }
    }
    checkPasswordAuth()
  }, [supabase])

  const handleRoleSelect = (role: 'user' | 'player' | 'scout') => {
    if (role === currentRole) return
    
    // For scout, redirect to new onboarding flow
    if (role === 'scout') {
      router.push('/scout')
      return
    }
    
    setSelectedRole(role)
    setShowModal(true)
    setError(null)
    setPassword('')
  }

  const handleConvert = async () => {
    if (!selectedRole) return

    setLoading(true)
    setError(null)

    try {
      // For OAuth users without password, we'll skip password verification
      // but still require confirmation
      const passwordToSend = hasPassword ? password : undefined

      if (hasPassword && !password) {
        setError('Please enter your password to confirm this change.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/profile/convert-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newRole: selectedRole,
          password: passwordToSend,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert role')
      }

      // Redirect to appropriate page
      if (data.redirectUrl) {
        router.push(data.redirectUrl)
        router.refresh()
      } else {
        router.push('/profile')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to convert role. Please try again.')
      setLoading(false)
    }
  }

  const getRoleDescription = (role: 'user' | 'player' | 'scout') => {
    switch (role) {
      case 'user':
        return 'Basic profile with name, username, and birthday. No player or scout features.'
      case 'player':
        return 'Get evaluations from scouts. Add your film links, position, and school information.'
      case 'scout':
        return 'Evaluate player film and connect with athletes. Add your organization and expertise.'
      default:
        return ''
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-black mb-2">Account Type</h3>
        <p className="text-sm text-gray-600 mb-4">
          Your current account type: <span className="font-semibold capitalize">{currentRole}</span>
        </p>
        <p className="text-sm text-gray-600 mb-4">
          You can change your account type at any time. This will update what features are available to you.
        </p>

        <div className="space-y-3">
          {currentRole !== 'user' && (
            <button
              onClick={() => handleRoleSelect('user')}
              className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 text-left transition-all"
            >
              <div className="font-semibold text-black mb-1">Switch to Basic User</div>
              <div className="text-sm text-gray-600">{getRoleDescription('user')}</div>
            </button>
          )}

          {currentRole !== 'player' && (
            <button
              onClick={() => handleRoleSelect('player')}
              className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 text-left transition-all"
            >
              <div className="font-semibold text-black mb-1">Switch to Player</div>
              <div className="text-sm text-gray-600">{getRoleDescription('player')}</div>
            </button>
          )}

          {currentRole !== 'scout' && (
            <>
              {hasPendingApplication ? (
                <div className="w-full p-4 rounded-lg border-2 border-amber-200 bg-amber-50">
                  <div className="font-semibold text-black mb-1">Scout Application Pending</div>
                  <div className="text-sm text-gray-600">
                    Your scout application is under review. You will be notified once a decision has been made.
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleRoleSelect('scout')}
                  className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 text-left transition-all"
                >
                  <div className="font-semibold text-black mb-1">Apply to Become a Scout</div>
                  <div className="text-sm text-gray-600">{getRoleDescription('scout')}</div>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Conversion Confirmation Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setSelectedRole(null)
          setPassword('')
          setError(null)
        }}
        title={`Convert to ${selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : ''} Account`}
      >
        <div className="space-y-4">
          <p className="text-gray-700 text-sm leading-relaxed">
            You're about to convert your account from <strong>{currentRole}</strong> to <strong>{selectedRole}</strong>.
            {selectedRole !== 'user' && ' You\'ll be taken to a setup page to complete your profile.'}
          </p>

          {selectedRole === 'user' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Converting to a basic user account will remove all player and scout-specific information from your profile.
              </p>
            </div>
          )}

          {hasPassword && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
                Enter your password to confirm <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                required
                placeholder="Your password"
              />
            </div>
          )}

          {!hasPassword && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Since you signed up with Google, no password verification is required. Click confirm to proceed.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowModal(false)
                setSelectedRole(null)
                setPassword('')
                setError(null)
              }}
              className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConvert}
              disabled={loading || (hasPassword && !password)}
              className="flex-1 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Converting...' : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

