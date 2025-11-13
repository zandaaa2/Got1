'use client'

import { useMemo, useRef, useState } from 'react'
import { SportSelector } from './SportSelector'

interface HudlLink {
  link: string
  sport: string
}

interface HudlLinkSelectorProps {
  hudlLinks: HudlLink[] | null | undefined
  onChange: (links: HudlLink[]) => void
}

export default function HudlLinkSelector({ hudlLinks, onChange }: HudlLinkSelectorProps) {
  // Use ref to store stable IDs that don't cause re-mounting on value changes
  const linkIdsRef = useRef<string[]>([])
  
  // Local state to manage links - this ensures we have control
  const [localLinks, setLocalLinks] = useState<HudlLink[]>(() => {
    if (hudlLinks && Array.isArray(hudlLinks) && hudlLinks.length > 0) {
      return hudlLinks
    }
    return [{ link: '', sport: '' }]
  })

  // Sync with props when they change externally
  useMemo(() => {
    if (hudlLinks && Array.isArray(hudlLinks) && hudlLinks.length > 0) {
      setLocalLinks(hudlLinks)
      // Ensure we have enough IDs
      while (linkIdsRef.current.length < hudlLinks.length) {
        linkIdsRef.current.push(`link-${linkIdsRef.current.length}-${Date.now()}-${Math.random()}`)
      }
    } else if (!hudlLinks || hudlLinks.length === 0) {
      if (linkIdsRef.current.length === 0) {
        linkIdsRef.current.push(`link-0-${Date.now()}-${Math.random()}`)
      }
      setLocalLinks([{ link: '', sport: '' }])
    }
  }, [hudlLinks])

  const addLink = () => {
    const newLinks = [...localLinks, { link: '', sport: '' }]
    linkIdsRef.current.push(`link-${linkIdsRef.current.length}-${Date.now()}-${Math.random()}`)
    setLocalLinks(newLinks)
    onChange(newLinks)
  }

  const removeLink = (index: number) => {
    if (localLinks.length > 1) {
      const newLinks = localLinks.filter((_, i) => i !== index)
      linkIdsRef.current.splice(index, 1)
      setLocalLinks(newLinks)
      onChange(newLinks)
    }
  }

  const updateLink = (index: number, field: 'link' | 'sport', value: string) => {
    const updated = localLinks.map((link, i) => 
      i === index ? { ...link, [field]: value } : link
    )
    setLocalLinks(updated)
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-black">
          Film Links & Sports <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            addLink()
          }}
          className="text-sm px-3 py-1.5 bg-black text-white rounded hover:bg-gray-800 transition-colors"
        >
          + Add Another Link
        </button>
      </div>

      {localLinks.map((hudlLink, index) => (
        <div 
          key={linkIdsRef.current[index] || `link-${index}`} 
          className="border border-gray-200 rounded-lg p-4 bg-gray-50"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-sm font-medium text-black">Link #{index + 1}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                removeLink(index)
              }}
              disabled={localLinks.length === 1}
              className={`text-sm ${
                localLinks.length === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-red-600 hover:text-red-800'
              }`}
            >
              Remove
            </button>
          </div>

          <div className="mb-4">
            <label htmlFor={`hudl_link_${index}`} className="block text-sm font-medium text-black mb-2">
              Film Link
            </label>
            <input
              type="text"
              id={`hudl_link_${index}`}
              name={`hudl_link_${index}`}
              value={hudlLink.link}
              onChange={(e) => {
                const value = e.target.value
                updateLink(index, 'link', value)
              }}
              onKeyDown={(e) => {
                e.stopPropagation()
              }}
              placeholder="https://www.hudl.com/profile/yourname"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
              autoComplete="off"
            />
          </div>

          <div>
            <SportSelector
              selectedSport={hudlLink.sport}
              onSelect={(sport) => updateLink(index, 'sport', sport)}
              label="Sport for this Link"
              availableSports={['football', 'basketball']}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
