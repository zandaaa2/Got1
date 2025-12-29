'use client'

import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'
import PullToRefresh from '@/components/shared/PullToRefresh'

export default function ProfileRefreshWrapper({ children }: { children: ReactNode }) {
  const router = useRouter()
  
  const handleRefresh = async () => {
    router.refresh()
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      {children}
    </PullToRefresh>
  )
}

