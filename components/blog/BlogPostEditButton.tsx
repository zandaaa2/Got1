'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BlogPostEditButtonProps {
  slug: string
}

export default function BlogPostEditButton({ slug }: BlogPostEditButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleEdit = () => {
    router.push(`/blog/${slug}/edit`)
  }

  return (
    <button
      onClick={handleEdit}
      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      Edit Post
    </button>
  )
}

