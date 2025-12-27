'use client'

import PostCard from './PostCard'
import EvaluationCard from './EvaluationCard'
import BlogCard from './BlogCard'

interface FeedItemProps {
  item: {
    type: 'post' | 'evaluation' | 'blog'
    id: string
    created_at: string
    data: any
  }
}

export default function FeedItem({ item }: FeedItemProps) {
  if (item.type === 'post') {
    return <PostCard post={item.data} />
  } else if (item.type === 'evaluation') {
    return <EvaluationCard evaluation={item.data} />
  } else if (item.type === 'blog') {
    return <BlogCard blog={item.data} />
  }
  return null
}
