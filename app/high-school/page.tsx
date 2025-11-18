import { redirect } from 'next/navigation'

/**
 * High school index page - redirects to browse with high schools filter
 */
export default function HighSchoolIndexPage() {
  // Redirect to browse page with high schools view
  redirect('/browse?view=high-schools')
}


