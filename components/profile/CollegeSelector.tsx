'use client'

import { useState, useEffect, useRef } from 'react'
import { colleges, searchColleges, type College } from '@/lib/colleges'
import Image from 'next/image'

interface CollegeSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
}

export default function CollegeSelector({ value, onChange, label, placeholder }: CollegeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(value)
  const [filteredColleges, setFilteredColleges] = useState<College[]>([])
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Find selected college on mount or when value changes
  useEffect(() => {
    const college = colleges.find(c => c.name === value)
    setSelectedCollege(college || null)
    setSearchQuery(value)
  }, [value])

  // Handle search
  useEffect(() => {
    const results = searchColleges(searchQuery || '')
    setFilteredColleges(results.slice(0, 15))
  }, [searchQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (college: College) => {
    setSelectedCollege(college)
    setSearchQuery(college.name)
    onChange(college.name)
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchQuery(newValue)
    onChange(newValue) // Allow custom input
    setIsOpen(true)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-black mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {selectedCollege && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-white rounded-md overflow-hidden">
            <Image
              src={getCollegeLogo(selectedCollege.domain, 32, selectedCollege.name)}
              alt=""
              width={24}
              height={24}
              className="object-contain"
              unoptimized
            />
          </div>
        )}
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || 'Search or type college name...'}
          className={`w-full ${selectedCollege ? 'pl-12' : 'pl-4'} pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black`}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {filteredColleges.length > 0 ? (
            filteredColleges.map((college) => (
              <button
                key={college.domain}
                type="button"
                onClick={() => handleSelect(college)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
              >
                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-md overflow-hidden flex-shrink-0">
                  <Image
                    src={getCollegeLogo(college.domain, 32, college.name)}
                    alt=""
                    width={32}
                    height={32}
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black truncate">{college.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {college.conference}{college.division ? ` · ${college.division}` : ''}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No colleges found. You can type a custom name.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

