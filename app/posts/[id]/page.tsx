import { createServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createServerClient()
  const { data: post, error } = await supabase
    .from('posts')
    .select('id, user_id, content, image_url, video_url, video_thumbnail_url, created_at')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !post) {
    return {
      title: 'Post Not Found | Got1',
    }
  }

  // Fetch profile for the poster
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, username, full_name, avatar_url')
    .eq('user_id', post.user_id)
    .maybeSingle()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://got1.app'
  const postUrl = `${baseUrl}/posts/${params.id}`
  
  // Truncate content for title/description (max 200 chars)
  const contentPreview = post.content 
    ? (post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content)
    : 'Post on Got1'

  // Use post image if available, otherwise use poster's avatar, otherwise no image
  let imageUrl: string | undefined
  if (post.image_url) {
    imageUrl = post.image_url.startsWith('http') 
      ? post.image_url 
      : `${baseUrl}${post.image_url.startsWith('/') ? post.image_url : '/' + post.image_url}`
  } else if (profile?.avatar_url && profile.avatar_url) {
    // Use poster's avatar if no post image
    imageUrl = profile.avatar_url.startsWith('http')
      ? profile.avatar_url
      : `${baseUrl}${profile.avatar_url.startsWith('/') ? profile.avatar_url : '/' + profile.avatar_url}`
  }

  const posterName = profile?.full_name || 'User'

  return {
    title: `${posterName}'s Post | Got1`,
    description: contentPreview,
    openGraph: {
      title: contentPreview, // Content at the top
      description: posterName, // Profile name at the bottom
      url: postUrl, // Full URL to the post page
      type: 'article',
      ...(imageUrl && {
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: contentPreview,
          },
        ],
      }),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: contentPreview, // Content at the top
      description: posterName, // Profile name at the bottom
      ...(imageUrl && {
        images: [imageUrl],
      }),
    },
  }
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Fetch the post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, user_id, content, image_url, video_url, video_thumbnail_url, created_at, updated_at')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (postError || !post) {
    notFound()
  }

  // Fetch the poster's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, username, full_name, avatar_url, organization, school, position')
    .eq('user_id', post.user_id)
    .maybeSingle()

  const profilePath = profile?.username 
    ? `/${profile.username}` 
    : `/profile/${profile?.id || ''}`

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="pt-12 pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-8 md:px-12">
          {/* Back Button */}
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          {/* Post Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            {/* Author Header */}
            <div className="flex items-center gap-3 mb-4">
              <Link href={profilePath} className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  {profile && profile.avatar_url && isMeaningfulAvatar(profile.avatar_url) ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name || 'User'}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${getGradientForId(post.user_id)}`}>
                      <span className="text-white text-lg font-semibold">
                        {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={profilePath} className="hover:opacity-80 transition-opacity">
                  <h3 className="font-semibold text-black truncate">
                    {profile?.full_name || 'Anonymous'}
                  </h3>
                </Link>
                <p className="text-sm text-gray-600 truncate">
                  {profile?.organization || profile?.school || profile?.position || ''}
                </p>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {formatDate(post.created_at)}
              </span>
            </div>

            {/* Content */}
            {post.content && (
              <div className="mb-4">
                <p className="text-gray-900 whitespace-pre-wrap break-words">{post.content}</p>
              </div>
            )}

            {/* Media */}
            {post.image_url && (
              <div className="mb-4 rounded-lg overflow-hidden">
                <Image
                  src={post.image_url}
                  alt="Post image"
                  width={800}
                  height={600}
                  className="w-full h-auto object-contain max-h-96"
                  unoptimized
                />
              </div>
            )}

            {post.video_url && (
              <div className="mb-4 rounded-lg overflow-hidden bg-black">
                <video
                  src={post.video_url}
                  controls
                  poster={post.video_thumbnail_url || undefined}
                  className="w-full max-h-96"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

