'use client'

interface SportOption {
  emoji: string
  name: string
  value: string
}

const SPORTS: SportOption[] = [
  { emoji: '🏈', name: 'Football', value: 'football' },
  { emoji: '🏀', name: "Men's Basketball", value: 'mens-basketball' },
  { emoji: '🏀', name: "Women's Basketball", value: 'womens-basketball' },
  { emoji: '⚽', name: 'Soccer', value: 'soccer' },
  { emoji: '⚾', name: 'Baseball', value: 'baseball' },
  { emoji: '🥎', name: 'Softball', value: 'softball' },
  { emoji: '🏐', name: 'Volleyball', value: 'volleyball' },
  { emoji: '🎾', name: 'Tennis', value: 'tennis' },
  { emoji: '🏌️', name: 'Golf', value: 'golf' },
  { emoji: '🏃', name: 'Track & Field', value: 'track' },
  { emoji: '🏊', name: 'Swimming', value: 'swimming' },
  { emoji: '🤼', name: 'Wrestling', value: 'wrestling' },
  { emoji: '🏋️', name: 'Weightlifting', value: 'weightlifting' },
  { emoji: '🏑', name: 'Lacrosse', value: 'lacrosse' },
]

interface SportSelectorProps {
  selectedSport: string
  onSelect: (sport: string) => void
  label?: string
}

export function SportSelector({ selectedSport, onSelect, label = 'Sport' }: SportSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-black mb-2">
        {label}
      </label>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {SPORTS.map((sport) => (
          <button
            key={sport.value}
            type="button"
            onClick={() => onSelect(sport.value)}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedSport === sport.value
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-gray-300 hover:border-gray-400'
            }`}
            title={sport.name}
          >
            <span className="text-2xl">{sport.emoji}</span>
          </button>
        ))}
      </div>
      {selectedSport && (
        <p className="mt-2 text-sm text-gray-600">
          Selected: {SPORTS.find(s => s.value === selectedSport)?.emoji} {SPORTS.find(s => s.value === selectedSport)?.name}
        </p>
      )}
    </div>
  )
}

interface MultiSportSelectorProps {
  selectedSports: string[]
  onToggle: (sport: string) => void
  label?: string
}

export function MultiSportSelector({ selectedSports, onToggle, label = 'Sports' }: MultiSportSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-black mb-2">
        {label}
      </label>
      <select
        multiple
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white min-h-[200px]"
        onChange={(e) => {
          const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
          // Toggle each newly selected or deselected option
          selectedOptions.forEach(value => {
            if (!selectedSports.includes(value)) {
              onToggle(value)
            }
          })
          // Remove deselected options
          selectedSports.forEach(value => {
            if (!selectedOptions.includes(value)) {
              onToggle(value)
            }
          })
        }}
        value={selectedSports}
      >
        {SPORTS.map((sport) => (
          <option 
            key={sport.value} 
            value={sport.value}
            className="py-2 cursor-pointer"
          >
            {sport.emoji} {sport.name}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-gray-500">
        Hold Cmd (Mac) or Ctrl (Windows) to select multiple sports
      </p>
      {selectedSports.length > 0 && (
        <p className="mt-2 text-sm text-gray-600">
          Selected: {selectedSports.map(s => SPORTS.find(sp => sp.value === s)?.name).join(', ')}
        </p>
      )}
    </div>
  )
}

