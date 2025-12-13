'use client'

import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  /**
   * Variant determines which logo file to use:
   * - 'regular': Use black.png (for light backgrounds)
   * - 'white': Use white.png (for dark/transparent backgrounds)
   */
  variant?: 'regular' | 'white'
  /**
   * Size of the logo
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Whether the logo should be a link to home
   */
  linkToHome?: boolean
  /**
   * Additional className
   */
  className?: string
  /**
   * Custom width (overrides size)
   */
  width?: number
  /**
   * Custom height (overrides size)
   */
  height?: number
}

const sizeMap = {
  sm: { width: 80, height: 24 },
  md: { width: 120, height: 36 },
  lg: { width: 140, height: 40 },
}

export default function Logo({
  variant = 'regular',
  size = 'md',
  linkToHome = true,
  className = '',
  width,
  height,
}: LogoProps) {
  const logoPath = variant === 'white' 
    ? '/got1-logos/white.png'
    : '/got1-logos/black.png'
  
  const dimensions = width && height 
    ? { width, height }
    : sizeMap[size]

  const logoImage = (
    <Image
      src={logoPath}
      alt="Got1"
      width={dimensions.width}
      height={dimensions.height}
      className={`object-contain hover:opacity-70 transition-opacity ${className}`}
      priority
    />
  )

  if (linkToHome) {
    return (
      <Link href="/" className="flex items-center">
        {logoImage}
      </Link>
    )
  }

  return logoImage
}
