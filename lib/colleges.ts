import { collegeEntries, type CollegeEntry } from './college-data'

export type College = CollegeEntry

export const colleges: College[] = collegeEntries

export function getCollegeLogo(slug: string): string | undefined {
  return colleges.find(college => college.slug === slug)?.logo
}

export function searchColleges(query: string): College[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return colleges

  return colleges.filter(college =>
    college.name.toLowerCase().includes(normalized) ||
    college.conference.toLowerCase().includes(normalized)
  )
}

