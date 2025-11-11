'use client'

import Link from 'next/link'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'

interface HeaderUserAvatarProps {
  userId: string
  profileUrl?: string
  avatarUrl?: string | null
  fullName?: string | null
  username?: string | null
  email?: string | null
  showBorder?: boolean
}

export default function HeaderUserAvatar({
  userId,
  profileUrl = '/profile',
  avatarUrl,
  fullName,
  username,
  email,
  showBorder = false,
}: HeaderUserAvatarProps) {
  const meaningfulAvatar = isMeaningfulAvatar(avatarUrl) ? avatarUrl : null
  const initialSource =
    fullName?.trim()?.charAt(0) || username?.charAt(0) || email?.charAt(0) || 'U'
  const initial = initialSource.toUpperCase()
  const gradientClass = getGradientForId(userId)

  return (
    <Link href={profileUrl} className="cursor-pointer hover:opacity-80 transition-opacity">
      <div
        className={`w-10 h-10 rounded-full overflow-hidden ${
          showBorder ? 'border-2 border-black p-0.5' : ''
        }`}
      >
        {meaningfulAvatar ? (
          <img src={meaningfulAvatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
        ) : (
          <div
            className={`w-full h-full rounded-full flex items-center justify-center text-white font-semibold ${gradientClass}`}
          >
            {initial}
          </div>
        )}
      </div>
    </Link>
  )
}
