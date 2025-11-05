'use client'

import { SportSelector } from './SportSelector'

interface HudlLink {
  link: string
  sport: string
}

interface HudlLinkSelectorProps {
  hudlLinks: HudlLink[]
  onChange: (links: HudlLink[]) => void
}

export default function HudlLinkSelector({ hudlLinks, onChange }: HudlLinkSelectorProps) {
  const addLink = () => {
    onChange([...hudlLinks, { link: '', sport: '' }])
  }

  const removeLink = (index: number) => {
    if (hudlLinks.length > 1) {
      onChange(hudlLinks.filter((_, i) => i !== index))
    }
  }

  const updateLink = (index: number, field: 'link' | 'sport', value: string) => {
    const updated = [...hudlLinks]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-black">
          Hudl Links & Sports
        </label>
        <button
          type="button"
          onClick={addLink}
          className="text-sm px-3 py-1.5 bg-black text-white rounded hover:bg-gray-800 transition-colors"
        >
          + Add Another Link
        </button>
      </div>

      {hudlLinks.map((hudlLink, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-start justify-between mb-3">
            <span className="text-sm font-medium text-black">Link #{index + 1}</span>
            <button
              type="button"
              onClick={() => removeLink(index)}
              disabled={hudlLinks.length === 1}
              className={`text-sm ${
                hudlLinks.length === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-red-600 hover:text-red-800'
              }`}
            >
              Remove
            </button>
          </div>

          <div className="mb-4">
            <label htmlFor={`hudl_link_${index}`} className="block text-sm font-medium text-black mb-2">
              Hudl Link
            </label>
            <input
              type="url"
              id={`hudl_link_${index}`}
              value={hudlLink.link}
              onChange={(e) => updateLink(index, 'link', e.target.value)}
              placeholder="https://www.hudl.com/profile/yourname"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>

          <div>
            <SportSelector
              selectedSport={hudlLink.sport}
              onSelect={(sport) => updateLink(index, 'sport', sport)}
              label="Sport for this Link"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

