'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'

interface ScoutApplicationsListProps {
  applications: any[]
}

export default function ScoutApplicationsList({ applications }: ScoutApplicationsListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get initial filter from URL, default to 'pending'
  const initialFilter = (searchParams.get('filter') as 'all' | 'pending' | 'approved' | 'denied') || 'pending'
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>(initialFilter)

  // Update filter when URL changes
  useEffect(() => {
    const urlFilter = searchParams.get('filter') as 'all' | 'pending' | 'approved' | 'denied'
    if (urlFilter && ['all', 'pending', 'approved', 'denied'].includes(urlFilter)) {
      setFilter(urlFilter)
    }
  }, [searchParams])

  const filteredApplications = applications.filter((app) => {
    if (filter === 'all') return true
    const matches = app.status === filter
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`Filter check: app.status="${app.status}", filter="${filter}", matches=${matches}`)
    }
    return matches
  })
  
  // Debug: Log filtered results
  useEffect(() => {
    console.log(`Filter: ${filter}, Total apps: ${applications.length}, Filtered: ${filteredApplications.length}`)
    console.log('All statuses:', applications.map(app => ({ id: app.id, status: app.status })))
    console.log('Filtered apps:', filteredApplications.map(app => ({ id: app.id, status: app.status })))
  }, [filter, applications, filteredApplications])

  const pendingCount = applications.filter((app) => app.status === 'pending').length
  const approvedCount = applications.filter((app) => app.status === 'approved').length
  const deniedCount = applications.filter((app) => app.status === 'denied').length

  /**
   * Updates the filter and URL when a tab is clicked.
   */
  const handleFilterChange = (newFilter: 'all' | 'pending' | 'approved' | 'denied') => {
    setFilter(newFilter)
    // Update URL without reloading page
    const url = new URL(window.location.href)
    if (newFilter === 'pending') {
      url.searchParams.delete('filter')
    } else {
      url.searchParams.set('filter', newFilter)
    }
    router.push(url.pathname + url.search)
  }

  return (
    <div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => handleFilterChange('pending')}
            className={`px-4 py-2 font-medium border-b-2 ${
              filter === 'pending'
                ? 'border-black text-black'
                : 'border-transparent text-gray-600 hover:text-black'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => handleFilterChange('approved')}
            className={`px-4 py-2 font-medium border-b-2 ${
              filter === 'approved'
                ? 'border-black text-black'
                : 'border-transparent text-gray-600 hover:text-black'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => handleFilterChange('denied')}
            className={`px-4 py-2 font-medium border-b-2 ${
              filter === 'denied'
                ? 'border-black text-black'
                : 'border-transparent text-gray-600 hover:text-black'
            }`}
          >
            Denied ({deniedCount})
          </button>
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-2 font-medium border-b-2 ${
              filter === 'all'
                ? 'border-black text-black'
                : 'border-transparent text-gray-600 hover:text-black'
            }`}
          >
            All ({applications.length})
          </button>
        </div>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No {filter === 'all' ? '' : filter} applications found.</p>
          {applications.length > 0 && (
            <p className="text-sm mt-2">
              Total applications: {applications.length} | 
              Pending: {pendingCount} | 
              Approved: {approvedCount} | 
              Denied: {deniedCount}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <Link
              key={application.id}
              href={`/admin/scout-applications/${application.id}`}
              className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {application.profile?.avatar_url ? (
                      <Image
                        src={application.profile.avatar_url}
                        alt={application.profile.full_name || 'Profile'}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-semibold">
                          {application.profile?.full_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-black text-lg mb-1">
                      {application.profile?.full_name || 'Unknown'}
                    </h3>
                    <p className="text-black text-sm mb-2">
                      <strong>Position:</strong> {application.current_position}
                    </p>
                    <p className="text-black text-sm mb-2">
                      <strong>Workplace:</strong> {application.current_workplace}
                    </p>
                    <p className="text-gray-600 text-xs">
                      Submitted:{' '}
                      {new Date(application.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      application.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : application.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {application.status}
                  </span>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

