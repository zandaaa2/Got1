'use client'

import { useState, useRef, useEffect } from 'react'

interface PositionMultiSelectProps {
  selectedPositions: string[]
  onChange: (positions: string[]) => void
  label?: string
  disabled?: boolean
}

// Preset football positions grouped by category
const PRESET_POSITIONS = {
  'Offense': ['QB', 'RB', 'FB', 'WR', 'TE', 'OL', 'C', 'G', 'T'],
  'Defense': ['DL', 'DE', 'DT', 'NT', 'LB', 'ILB', 'OLB', 'DB', 'CB', 'S', 'FS', 'SS'],
  'Special Teams': ['K', 'P', 'LS', 'KR', 'PR']
}

const ALL_PRESET_POSITIONS = Object.values(PRESET_POSITIONS).flat()

export default function PositionMultiSelect({
  selectedPositions,
  onChange,
  label = 'Position(s)',
  disabled = false,
}: PositionMultiSelectProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [otherText, setOtherText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  // Separate preset positions from "Other" custom positions
  const presetSelected = selectedPositions.filter(pos => ALL_PRESET_POSITIONS.includes(pos))
  const otherSelected = selectedPositions.filter(pos => !ALL_PRESET_POSITIONS.includes(pos))

  // Initialize otherText with first custom position if exists
  useEffect(() => {
    if (otherSelected.length > 0 && !otherText) {
      setOtherText(otherSelected[0])
    }
  }, [otherSelected.length])

  // Filter positions based on search
  const filteredPresets = ALL_PRESET_POSITIONS.filter(pos =>
    pos.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleTogglePosition = (position: string) => {
    if (selectedPositions.includes(position)) {
      onChange(selectedPositions.filter(p => p !== position))
    } else {
      onChange([...selectedPositions, position])
    }
  }

  const handleRemovePosition = (position: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selectedPositions.filter(p => p !== position))
  }

  const handleOtherTextChange = (value: string) => {
    setOtherText(value)
  }

  const handleAddOther = () => {
    if (otherText.trim() && !selectedPositions.includes(otherText.trim())) {
      // Remove any existing "Other" positions first
      const withoutOther = selectedPositions.filter(pos => ALL_PRESET_POSITIONS.includes(pos))
      onChange([...withoutOther, otherText.trim()])
      setOtherText('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddOther()
    }
  }

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsModalOpen(false)
        setSearchQuery('')
      }
    }

    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isModalOpen])

  return (
    <>
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-black">
            {label}
          </label>
        )}
        <button
          type="button"
          onClick={() => !disabled && setIsModalOpen(true)}
          disabled={disabled}
          className={`w-full px-4 py-2 text-left border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-between ${
            disabled ? '' : 'hover:border-gray-400 cursor-pointer'
          }`}
        >
          <div className="flex flex-wrap gap-2 flex-1">
            {selectedPositions.length > 0 ? (
              selectedPositions.map((pos) => (
                <span
                  key={pos}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium"
                >
                  {pos}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemovePosition(pos, e)
                      }}
                      className="hover:text-blue-900"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </span>
              ))
            ) : (
              <span className="text-gray-500">Select positions...</span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isModalOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {selectedPositions.length > 0 && (
          <p className="text-xs text-gray-500">
            {selectedPositions.length} position{selectedPositions.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            ref={modalRef}
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-black">Select Positions</h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false)
                  setSearchQuery('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search positions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Preset Positions */}
              <div className="space-y-4">
                {Object.entries(PRESET_POSITIONS).map(([category, positions]) => {
                  const filteredCategoryPositions = positions.filter(pos =>
                    filteredPresets.includes(pos)
                  )
                  
                  if (filteredCategoryPositions.length === 0 && searchQuery) return null

                  return (
                    <div key={category}>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">{category}</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {filteredCategoryPositions.map((pos) => {
                          const isSelected = presetSelected.includes(pos)
                          return (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => handleTogglePosition(pos)}
                              className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                                isSelected
                                  ? 'bg-black text-white border-black'
                                  : 'bg-white text-black border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {pos}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Other Option */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Other (Custom)</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter custom position..."
                    value={otherText}
                    onChange={(e) => handleOtherTextChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <button
                    type="button"
                    onClick={handleAddOther}
                    disabled={!otherText.trim() || selectedPositions.includes(otherText.trim())}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                  >
                    Add
                  </button>
                </div>
                {otherSelected.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Custom positions:</p>
                    <div className="flex flex-wrap gap-2">
                      {otherSelected.map((pos) => (
                        <span
                          key={pos}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm"
                        >
                          {pos}
                          <button
                            type="button"
                            onClick={() => handleRemovePosition(pos, {} as React.MouseEvent)}
                            className="hover:text-gray-900"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false)
                  setSearchQuery('')
                }}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

