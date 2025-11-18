'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import Image from 'next/image'
import { getGradientForId } from '@/lib/gradients'

interface HighSchoolSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  onSchoolSelected?: (schoolId: string | null, schoolName: string) => void
}

export default function HighSchoolSelector({ 
  value, 
  onChange, 
  label, 
  placeholder,
  disabled = false,
  onSchoolSelected
}: HighSchoolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(value)
  const [filteredSchools, setFilteredSchools] = useState<any[]>([])
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Find selected school on mount or when value changes
  useEffect(() => {
    if (value) {
      loadSchoolByName(value)
    } else {
      setSelectedSchool(null)
    }
    setSearchQuery(value)
  }, [value])

  const loadSchoolByName = async (schoolName: string) => {
    try {
      const { data } = await supabase
        .from('high_schools')
        .select('id, name, username, logo_url')
        .ilike('name', `%${schoolName}%`)
        .eq('admin_status', 'approved')
        .limit(1)
        .maybeSingle()
      
      if (data) {
        setSelectedSchool(data)
      }
    } catch (error) {
      console.error('Error loading school:', error)
    }
  }

  // Handle search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setFilteredSchools([])
      return
    }

    const searchSchools = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('high_schools')
          .select('id, name, username, logo_url, address')
          .ilike('name', `%${searchQuery}%`)
          .eq('admin_status', 'approved')
          .order('name', { ascending: true })
          .limit(15)

        if (!error && data) {
          setFilteredSchools(data)
        }
      } catch (error) {
        console.error('Error searching schools:', error)
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(searchSchools, 300)
    return () => clearTimeout(timeoutId)
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

  const handleSelect = (school: any) => {
    setSelectedSchool(school)
    setSearchQuery(school.name)
    onChange(school.name)
    if (onSchoolSelected) {
      onSchoolSelected(school.id, school.name)
    }
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchQuery(newValue)
    onChange(newValue) // Allow custom input
    if (onSchoolSelected) {
      onSchoolSelected(null, newValue) // No school selected if custom input
    }
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
        {selectedSchool && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-white rounded-md overflow-hidden">
            {selectedSchool.logo_url ? (
              <Image
                src={selectedSchool.logo_url}
                alt=""
                width={24}
                height={24}
                className="object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-xs font-semibold text-white ${getGradientForId(selectedSchool.id)}`}>
                {selectedSchool.name.charAt(0)}
              </div>
            )}
          </div>
        )}
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={placeholder || 'Search for your high school...'}
          disabled={disabled}
          className={`w-full ${selectedSchool ? 'pl-12' : 'pl-4'} pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed`}
        />
        {!disabled && (
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
        )}
      </div>


      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">Searching...</div>
          ) : filteredSchools.length > 0 ? (
            filteredSchools.map((school) => (
              <button
                key={school.id}
                type="button"
                onClick={() => handleSelect(school)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
              >
                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-md overflow-hidden flex-shrink-0">
                  {school.logo_url ? (
                    <Image
                      src={school.logo_url}
                      alt=""
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-sm font-semibold text-white ${getGradientForId(school.id)}`}>
                      {school.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black truncate">{school.name}</p>
                  {school.address && (
                    <p className="text-xs text-gray-500 truncate">{school.address}</p>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              {searchQuery.trim().length >= 2 
                ? 'No schools found. You can type a custom name.'
                : 'Type at least 2 characters to search...'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

