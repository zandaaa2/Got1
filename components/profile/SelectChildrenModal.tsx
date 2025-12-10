'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/shared/Modal'
import { createClient } from '@/lib/supabase-client'
import Image from 'next/image'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'

interface Child {
  id: string
  user_id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  school: string | null
  graduation_year: number | null
}

interface SelectChildrenModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedChildren: Child[]) => void
  parentId: string
}

export default function SelectChildrenModal({
  isOpen,
  onClose,
  onConfirm,
  parentId,
}: SelectChildrenModalProps) {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildren, setSelectedChildren] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen && parentId) {
      loadChildren()
    }
  }, [isOpen, parentId])

  const loadChildren = async () => {
    try {
      setLoading(true)
      // Get all linked children for this parent
      const { data: links, error: linksError } = await supabase
        .from('parent_children')
        .select('player_id')
        .eq('parent_id', parentId)

      if (linksError) {
        console.error('Error loading children:', linksError)
        return
      }

      if (!links || links.length === 0) {
        setChildren([])
        setLoading(false)
        return
      }

      // Get profiles for all linked children
      const playerIds = links.map(link => link.player_id)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, username, avatar_url, school, graduation_year')
        .in('user_id', playerIds)
        .eq('role', 'player')

      if (profilesError) {
        console.error('Error loading child profiles:', profilesError)
        return
      }

      setChildren(profiles || [])
    } catch (error) {
      console.error('Error loading children:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleChild = (childId: string) => {
    const newSelected = new Set(selectedChildren)
    if (newSelected.has(childId)) {
      newSelected.delete(childId)
    } else {
      newSelected.add(childId)
    }
    setSelectedChildren(newSelected)
  }

  const handleConfirm = () => {
    const selected = children.filter(child => selectedChildren.has(child.id))
    if (selected.length > 0) {
      onConfirm(selected)
      setSelectedChildren(new Set())
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Children">
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Select which child(ren) you're purchasing evaluations for. Each selected child will receive their own evaluation from this scout.
        </p>

        {loading ? (
          <div className="py-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-sm text-gray-600">Loading children...</p>
          </div>
        ) : children.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-600 mb-4">No linked children found.</p>
            <p className="text-sm text-gray-500">
              Please link a player account first from your profile.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {children.map((child) => {
                const isSelected = selectedChildren.has(child.id)
                return (
                  <button
                    key={child.id}
                    onClick={() => toggleChild(child.id)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected ? 'border-black bg-black' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          {isMeaningfulAvatar(child.avatar_url) ? (
                            <Image
                              src={child.avatar_url}
                              alt={child.full_name || 'Child'}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center text-white text-sm font-semibold ${getGradientForId(child.id)}`}>
                              {child.full_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-black mb-1 truncate">
                            {child.full_name || 'Unnamed Player'}
                          </h3>
                          <div className="text-sm text-gray-600 space-y-0.5">
                            {child.username && (
                              <p className="truncate">@{child.username}</p>
                            )}
                            {(child.school || child.graduation_year) && (
                              <p className="truncate">
                                {[child.school, child.graduation_year].filter(Boolean).join(' • ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="pt-4 border-t border-gray-200 space-y-3">
              <button
                onClick={handleConfirm}
                disabled={selectedChildren.size === 0}
                className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue with {selectedChildren.size} {selectedChildren.size === 1 ? 'Child' : 'Children'}
              </button>
              
              <button
                onClick={onClose}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}



