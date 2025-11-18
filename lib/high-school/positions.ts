// Player positions for high school rosters
// Allows up to 2 positions per player

export const PLAYER_POSITIONS = [
  'Coach',
  'QB',
  'RB',
  'FB',
  'TE',
  'OT',
  'OG',
  'C',
  'WR',
  'CB',
  'S',
  'LB',
  'DE',
  'DT',
  'NT',
  'K',
  'P',
  'KR',
  'PR'
] as const

export type PlayerPosition = typeof PLAYER_POSITIONS[number]

export const MAX_POSITIONS = 2

export function isValidPosition(position: string): position is PlayerPosition {
  return PLAYER_POSITIONS.includes(position as PlayerPosition)
}

export function validatePositions(positions: string[]): { valid: boolean; error?: string } {
  if (positions.length === 0) {
    return { valid: false, error: 'At least one position is required' }
  }
  
  if (positions.length > MAX_POSITIONS) {
    return { valid: false, error: `Maximum ${MAX_POSITIONS} positions allowed` }
  }
  
  for (const position of positions) {
    if (!isValidPosition(position)) {
      return { valid: false, error: `Invalid position: ${position}` }
    }
  }
  
  // Check for duplicates
  if (new Set(positions).size !== positions.length) {
    return { valid: false, error: 'Duplicate positions are not allowed' }
  }
  
  return { valid: true }
}


