'use client'

import Image from 'next/image'

export default function WelcomeHero() {
  return (
    <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden">
      {/* Desktop Image */}
      <div className="hidden md:block absolute inset-0">
        <Image
          src="/landingpage/herohorizontal.jpg"
          alt="Football field"
          fill
          className="object-cover rounded-b-3xl"
          priority
          unoptimized
        />
        {/* Black transparent overlay */}
        <div className="absolute inset-0 bg-black/60 rounded-b-3xl" />
      </div>
      
      {/* Mobile Image */}
      <div className="md:hidden absolute inset-0">
        <Image
          src="/landingpage/herovertical.jpg"
          alt="Football field"
          fill
          className="object-cover rounded-b-3xl"
          priority
          unoptimized
        />
        {/* Black transparent overlay */}
        <div className="absolute inset-0 bg-black/60 rounded-b-3xl" />
      </div>
    </div>
  )
}
