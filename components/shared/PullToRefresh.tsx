'use client'

import { useState, useEffect, useRef, ReactNode, useCallback } from 'react'

interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void> | void
  disabled?: boolean
}

const PULL_THRESHOLD = 80 // Distance in pixels to trigger refresh
const MAX_PULL = 120 // Maximum pull distance

export default function PullToRefresh({ children, onRefresh, disabled = false }: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number>(0)
  const scrollTopRef = useRef<number>(0)
  const isPullingRef = useRef(false)
  const isRefreshingRef = useRef(false)
  const pullDistanceRef = useRef(0)

  // Keep refs in sync with state
  useEffect(() => {
    isPullingRef.current = isPulling
    isRefreshingRef.current = isRefreshing
    pullDistanceRef.current = pullDistance
  }, [isPulling, isRefreshing, pullDistance])

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshingRef.current) return
    
    const container = containerRef.current
    if (!container) return

    // Only allow pull if at the top of the scrollable area
    scrollTopRef.current = window.scrollY || document.documentElement.scrollTop
    if (scrollTopRef.current > 0) return

    startYRef.current = e.touches[0].clientY
    setIsPulling(true)
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current || isRefreshingRef.current) return

    const currentY = e.touches[0].clientY
    const deltaY = currentY - startYRef.current

    // Only allow downward pull
    if (deltaY > 0 && scrollTopRef.current === 0) {
      // Prevent default scrolling while pulling
      e.preventDefault()
      
      const distance = Math.min(deltaY, MAX_PULL)
      setPullDistance(distance)
    } else if (deltaY <= 0) {
      // Reset if user scrolls back up
      setIsPulling(false)
      setPullDistance(0)
    }
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return

    const currentPullDistance = pullDistanceRef.current
    if (currentPullDistance >= PULL_THRESHOLD && !isRefreshingRef.current) {
      setIsRefreshing(true)
      setPullDistance(PULL_THRESHOLD)
      
      try {
        await onRefresh()
      } catch (error) {
        console.error('Error refreshing:', error)
      } finally {
        // Reset after a short delay for smooth animation
        setTimeout(() => {
          setIsRefreshing(false)
          setIsPulling(false)
          setPullDistance(0)
        }, 300)
      }
    } else {
      // Reset if didn't reach threshold
      setIsPulling(false)
      setPullDistance(0)
    }
  }, [onRefresh])

  useEffect(() => {
    if (!isMobile || disabled) return

    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMobile, disabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  const shouldEnable = isMobile && !disabled

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator - only show if enabled */}
      {shouldEnable && (isPulling || isRefreshing) && (
        <div 
          className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center bg-white/90 backdrop-blur-sm transition-all duration-200"
          style={{
            height: `${Math.min(pullDistance, MAX_PULL)}px`,
            transform: `translateY(${isRefreshing ? 0 : Math.max(0, pullDistance - PULL_THRESHOLD)}px)`,
          }}
        >
          {isRefreshing ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
              <p className="text-xs text-gray-600">Refreshing...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div 
                className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full transition-transform"
                style={{
                  transform: `rotate(${Math.min(pullDistance / PULL_THRESHOLD * 360, 360)}deg)`,
                }}
              ></div>
              <p className="text-xs text-gray-600">
                {pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
              </p>
            </div>
          )}
        </div>
      )}
      <div style={{ paddingTop: shouldEnable && isRefreshing ? '60px' : '0', transition: 'padding-top 0.2s' }}>
        {children}
      </div>
    </div>
  )
}

