'use client'

import { useState, ReactNode } from 'react'

interface PlayerTabsProps {
  playerInfoContent: ReactNode
  evaluationsContent: ReactNode
  evaluationsCount: number
  postsContent?: ReactNode
  postsCount?: number
}

export default function PlayerTabs({ 
  playerInfoContent, 
  evaluationsContent, 
  evaluationsCount,
  postsContent,
  postsCount = 0
}: PlayerTabsProps) {
  const [activeTab, setActiveTab] = useState<'player-info' | 'evaluations' | 'posts'>('player-info')

  return (
    <section>
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex gap-6 md:gap-8">
            <button
              onClick={() => setActiveTab('player-info')}
              className={`pb-3 px-1 text-sm md:text-base font-medium transition-colors ${
                activeTab === 'player-info'
                  ? 'text-black border-b-2 border-black'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Player Info
            </button>
            <button
              onClick={() => setActiveTab('evaluations')}
              className={`pb-3 px-1 text-sm md:text-base font-medium transition-colors ${
                activeTab === 'evaluations'
                  ? 'text-black border-b-2 border-black'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Evaluations ({evaluationsCount})
            </button>
            {postsContent !== undefined && (
              <button
                onClick={() => setActiveTab('posts')}
                className={`pb-3 px-1 text-sm md:text-base font-medium transition-colors ${
                  activeTab === 'posts'
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                Posts ({postsCount})
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'player-info' ? (
          <div>
            {playerInfoContent}
          </div>
        ) : activeTab === 'evaluations' ? (
          <div>
            {evaluationsContent}
          </div>
        ) : (
          <div>
            {postsContent}
          </div>
        )}
      </div>
    </section>
  )
}

