'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/shared/Modal'

interface RoleSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (role: 'player' | 'parent' | 'scout' | 'skip') => void
}

export default function RoleSelectionModal({ isOpen, onClose, onSelect }: RoleSelectionModalProps) {
  const [selectedRole, setSelectedRole] = useState<'player' | 'parent' | 'scout' | 'skip' | null>(null)

  const handleContinue = () => {
    if (selectedRole) {
      onSelect(selectedRole)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Switch Account Type">
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Choose how you'd like to use Got1. You can always change this later.
        </p>

        {/* Player Option */}
        <button
          onClick={() => setSelectedRole('player')}
          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
            selectedRole === 'player'
              ? 'border-black bg-gray-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
              selectedRole === 'player' ? 'border-black bg-black' : 'border-gray-300'
            }`}>
              {selectedRole === 'player' && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-black mb-1">I'm a Player</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Get professional evaluations from verified college scouts. Share your film, receive detailed feedback, and improve your game.
              </p>
            </div>
          </div>
        </button>

        {/* Parent Option */}
        <button
          onClick={() => setSelectedRole('parent')}
          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
            selectedRole === 'parent'
              ? 'border-black bg-gray-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
              selectedRole === 'parent' ? 'border-black bg-black' : 'border-gray-300'
            }`}>
              {selectedRole === 'parent' && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-black mb-1">I'm a Parent</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Manage your child's player page, purchase evaluations on their behalf, and help them get discovered by college scouts.
              </p>
            </div>
          </div>
        </button>

        {/* Scout Option */}
        <button
          onClick={() => setSelectedRole('scout')}
          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
            selectedRole === 'scout'
              ? 'border-black bg-gray-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
              selectedRole === 'scout' ? 'border-black bg-black' : 'border-gray-300'
            }`}>
              {selectedRole === 'scout' && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-black mb-1">I'm a Scout</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Monetize your expertise by evaluating player film. Connect with talented athletes and build your reputation as a verified scout.
              </p>
            </div>
          </div>
        </button>

        {/* Continue Button */}
        <div className="pt-4 border-t border-gray-200 space-y-3">
          <button
            onClick={handleContinue}
            disabled={!selectedRole}
            className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Switch Account Type
          </button>
          
          {/* Cancel Button */}
          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}

