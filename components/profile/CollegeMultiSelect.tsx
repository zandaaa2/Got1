'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { collegeEntries, type CollegeEntry } from '@/lib/college-data'

interface CollegeMultiSelectProps {
  selectedColleges: string[] // Array of slugs
  onChange: (colleges: string[]) => void
  label?: string
  disabled?: boolean
  maxSelections?: number
}

const MAX_SELECTIONS = 7

// Group colleges by division for display
const groupByDivision = (colleges: CollegeEntry[]) => {
  const grouped: Record<string, CollegeEntry[]> = {}
  colleges.forEach(college => {
    const division = college.division || 'Other'
    if (!grouped[division]) {
      grouped[division] = []
    }
    grouped[division].push(college)
  })
  return grouped
}

// Division order for display
const DIVISION_ORDER = ['FBS', 'FCS', 'D2', 'D3', 'NAIA', 'NFL', 'Other']

export default function CollegeMultiSelect({
  selectedColleges,
  onChange,
  label = 'College Connections',
  disabled = false,
  maxSelections = MAX_SELECTIONS,
}: CollegeMultiSelectProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  // Get selected college objects
  const selectedCollegeObjects = selectedColleges
    .map(slug => collegeEntries.find(c => c.slug === slug))
    .filter((c): c is CollegeEntry => c !== undefined)

  // Filter colleges based on search
  const filteredColleges = searchQuery
    ? collegeEntries.filter(college =>
        college.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        college.conference.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : collegeEntries

  // Group filtered colleges by division
  const groupedColleges = groupByDivision(filteredColleges)

  const handleToggleCollege = (slug: string) => {
    if (selectedColleges.includes(slug)) {
      // Remove
      onChange(selectedColleges.filter(s => s !== slug))
    } else {
      // Add (check max)
      if (selectedColleges.length < maxSelections) {
        onChange([...selectedColleges, slug])
      }
    }
  }

  const handleRemoveCollege = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selectedColleges.filter(s => s !== slug))
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

  const isMaxReached = selectedColleges.length >= maxSelections

  return (
    <>
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-black">
            {label} {!disabled && <span className="text-gray-500">(Max {maxSelections})</span>}
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
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedCollegeObjects.length > 0 ? (
              <div className="flex items-center gap-1 -space-x-2">
                {selectedCollegeObjects.slice(0, 5).map((college) => (
                  <div
                    key={college.slug}
                    className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 overflow-hidden flex-shrink-0"
                  >
                    {college.logo ? (
                      <Image
                        src={college.logo}
                        alt={college.name}
                        width={32}
                        height={32}
                        className="w-full h-full object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-gray-600">
                        {college.name.charAt(0)}
                      </div>
                    )}
                  </div>
                ))}
                {selectedCollegeObjects.length > 5 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                    +{selectedCollegeObjects.length - 5}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-500">Select colleges...</span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isModalOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {selectedColleges.length > 0 && (
          <p className="text-xs text-gray-500">
            {selectedColleges.length} of {maxSelections} selected
          </p>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div
            ref={modalRef}
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-black">
                Select College Connections
                {isMaxReached && (
                  <span className="ml-2 text-sm text-gray-500">(Max {maxSelections} reached)</span>
                )}
              </h3>
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
                placeholder="Search colleges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Selected Colleges */}
            {selectedCollegeObjects.length > 0 && (
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <p className="text-xs font-semibold text-gray-700 mb-2">Selected:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCollegeObjects.map((college) => (
                    <div
                      key={college.slug}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                        {college.logo ? (
                          <Image
                            src={college.logo}
                            alt={college.name}
                            width={24}
                            height={24}
                            className="w-full h-full object-contain"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-semibold bg-gray-100 text-gray-600">
                            {college.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="text-gray-700">{college.name}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveCollege(college.slug, e)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg
                          className="w-4 h-4"
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
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {Object.keys(groupedColleges).length === 0 && searchQuery ? (
                <div className="text-center py-8 text-gray-500">
                  No colleges found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="space-y-6">
                  {DIVISION_ORDER.filter(div => groupedColleges[div]).map((division) => {
                    const colleges = groupedColleges[division]
                    if (!colleges || colleges.length === 0) return null

                    return (
                      <div key={division}>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 sticky top-0 bg-white py-1">
                          {division}
                        </h4>
                        <div className="space-y-2">
                          {colleges.map((college) => {
                            const isSelected = selectedColleges.includes(college.slug)
                            const canSelect = !isSelected && !isMaxReached

                            return (
                              <button
                                key={college.slug}
                                type="button"
                                onClick={() => canSelect && handleToggleCollege(college.slug)}
                                disabled={!canSelect && !isSelected}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left ${
                                  isSelected
                                    ? 'bg-blue-50 border-blue-300'
                                    : canSelect
                                    ? 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                                }`}
                              >
                                <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                                  {college.logo ? (
                                    <Image
                                      src={college.logo}
                                      alt={college.name}
                                      width={40}
                                      height={40}
                                      className="w-full h-full object-contain"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-gray-600">
                                      {college.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {college.name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {college.conference}
                                  </p>
                                </div>
                                {isSelected && (
                                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                                    <svg
                                      className="w-3 h-3 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {selectedColleges.length} of {maxSelections} selected
              </p>
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

