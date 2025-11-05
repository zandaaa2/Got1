'use client'

import { useSidebarWidth } from '@/hooks/useSidebarWidth'

interface DynamicLayoutProps {
  children: React.ReactNode
  header: React.ReactNode
}

/**
 * Client component that wraps page content and adjusts margins based on sidebar width.
 * This ensures the content area slides left when the sidebar is minimized.
 */
export default function DynamicLayout({ children, header }: DynamicLayoutProps) {
  const sidebarWidth = useSidebarWidth()

  return (
    <div 
      className="flex-1 transition-all duration-300"
      style={{ marginLeft: `${sidebarWidth}px` }}
    >
      <header
        className="fixed top-0 right-0 bg-white px-8 py-4 flex justify-end items-center gap-4 z-10 transition-all duration-300"
        style={{ left: `${sidebarWidth}px` }}
      >
        {header}
      </header>
      <main className="pt-20 px-8 pb-8">
        {children}
      </main>
    </div>
  )
}

