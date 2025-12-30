'use client'

import { useEffect, useState } from 'react'
import { SportSelector } from './SportSelector'

interface HudlLink {
  link: string
  sport: string
}

interface HudlLinkSelectorProps {
  hudlLinks: HudlLink[] | null | undefined
  onChange: (links: HudlLink[]) => void
}

const VALID_SPORTS = ['football', '7on7', 'mens-basketball']

export default function HudlLinkSelector({ hudlLinks, onChange }: HudlLinkSelectorProps) {
  // Initialize links from props or start with one empty link
  const getInitialLinks = (): HudlLink[] => {
    if (hudlLinks && Array.isArray(hudlLinks) && hudlLinks.length > 0) {
      return hudlLinks.map(hl => ({ link: hl.link || '', sport: hl.sport || '' }))
    }
    return [{ link: '', sport: '' }]
  }

  const [links, setLinks] = useState<HudlLink[]>(getInitialLinks())

  // Sync with props when they change externally
  useEffect(() => {
    if (hudlLinks && Array.isArray(hudlLinks) && hudlLinks.length > 0) {
      const initialLinks = hudlLinks.map(hl => ({ link: hl.link || '', sport: hl.sport || '' }))
      setLinks(initialLinks)
    } else if (!hudlLinks || (Array.isArray(hudlLinks) && hudlLinks.length === 0)) {
      setLinks([{ link: '', sport: '' }])
    }
  }, [hudlLinks])

  const updateLinks = (newLinks: HudlLink[]) => {
    setLinks(newLinks)
    onChange(newLinks)
  }

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...links]
    newLinks[index] = { ...newLinks[index], link: value }
    updateLinks(newLinks)
  }

  const handleSportChange = (index: number, sport: string) => {
    const newLinks = [...links]
    newLinks[index] = { ...newLinks[index], sport: sport }
    updateLinks(newLinks)
  }

  const addLink = () => {
    const newLinks = [...links, { link: '', sport: '' }]
    updateLinks(newLinks)
  }

  const removeLink = (index: number) => {
    if (links.length > 1) {
      const newLinks = links.filter((_, i) => i !== index)
      updateLinks(newLinks)
    }
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-black mb-2">
        Film Link(s) <span className="text-red-500">*</span>
      </label>
      {links.map((link, index) => (
        <div key={index} className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Link {index + 1}
            </label>
            <input
              type="url"
              value={link.link}
              onChange={(e) => handleLinkChange(index, e.target.value)}
              placeholder="https://www.hudl.com/profile/yourname"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              autoComplete="off"
            />
          </div>
          <div>
            <SportSelector
              selectedSport={link.sport}
              onSelect={(sport) => handleSportChange(index, sport)}
              label="Sport"
              availableSports={VALID_SPORTS}
            />
          </div>
          {links.length > 1 && (
            <button
              type="button"
              onClick={() => removeLink(index)}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Remove Link
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addLink}
        className="text-sm text-gray-600 hover:text-gray-800 underline"
      >
        + Add Another Link
      </button>
      <p className="text-xs text-gray-500 mt-2">
        Add links to your film (HUDL, QwikCut, or YouTube) and select the sport for each link.
      </p>
    </div>
  )
}
