'use client'

import { useEffect, useState } from 'react'

interface HudlLink {
  link: string
  sport: string
}

interface HudlLinkSelectorProps {
  hudlLinks: HudlLink[] | null | undefined
  onChange: (links: HudlLink[]) => void
}

export default function HudlLinkSelector({ hudlLinks, onChange }: HudlLinkSelectorProps) {
  // Get the first link from the array, or use empty string
  const getFirstLink = () => {
    if (hudlLinks && Array.isArray(hudlLinks) && hudlLinks.length > 0) {
      return hudlLinks[0].link || ''
    }
    return ''
  }

  const [linkValue, setLinkValue] = useState(getFirstLink())

  // Sync with props when they change externally
  useEffect(() => {
    setLinkValue(getFirstLink())
  }, [hudlLinks])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLinkValue(value)
    // Update the links array with the new value (no sport needed)
    onChange([{ link: value, sport: '' }])
  }

  return (
    <div>
      <label htmlFor="hudl_link" className="block text-sm font-medium text-black mb-2">
        Film Link <span className="text-red-500">*</span>
      </label>
      <input
        type="url"
        id="hudl_link"
        name="hudl_link"
        value={linkValue}
        onChange={handleChange}
        placeholder="https://www.hudl.com/profile/yourname"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        autoComplete="off"
      />
    </div>
  )
}
