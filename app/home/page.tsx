import { Suspense } from 'react'
import { createRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import HomeFeed from '@/components/home/HomeFeed'

export default async function HomePage() {
  const supabase = createRouteHandlerClient(() => cookies())
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/welcome')
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="home" />
      <DynamicLayout header={null}>
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="relative w-12 h-12 mx-auto">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-lg font-medium text-gray-900">Loading feed...</p>
            </div>
          </div>
        }>
          <HomeFeed />
        </Suspense>
      </DynamicLayout>
    </div>
  )
}
