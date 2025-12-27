import { createServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import WelcomeNavbar from '@/components/welcome/WelcomeNavbar'
import WelcomeFooter from '@/components/welcome/WelcomeFooter'
import Image from 'next/image'
import Link from 'next/link'
import BackButton from '@/components/shared/BackButton'
import { getBlogPost, getAllBlogPosts } from '@/lib/blog-posts'
import BlogPostEditButton from '@/components/blog/BlogPostEditButton'
import BlogInteractionFooter from '@/components/blog/BlogInteractionFooter'
import { isMeaningfulAvatar } from '@/lib/avatar'
import { getGradientForId } from '@/lib/gradients'
import MarkdownContent from '@/components/blog/MarkdownContent'
// Simple date formatting function
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export async function generateStaticParams() {
  const posts = await getAllBlogPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getBlogPost(params.slug)
  
  if (!post) {
    return {
      title: 'Blog Post Not Found | Got1',
    }
  }

  return {
    title: `${post.title} | Got1 Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.image],
    },
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getBlogPost(params.slug)
  
  if (!post) {
    notFound()
  }

  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Get the blog post with scout_id to check ownership and fetch author profile
  const { data: blogData } = await supabase
    .from('blog_posts')
    .select('scout_id, author_email')
    .eq('slug', params.slug)
    .single()

  // Check if user is the author (either by email or by scout_id)
  let isAuthor = false
  if (session?.user && blogData) {
    isAuthor = blogData.scout_id === session.user.id || blogData.author_email === session.user.email
  } else if (session?.user) {
    // Fallback to email check
    isAuthor = session.user.email === post.authorEmail
  }

  // Fetch author profile to get avatar and username
  let authorProfile = null
  if (blogData?.scout_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, full_name, user_id')
      .eq('user_id', blogData.scout_id)
      .maybeSingle()
    authorProfile = profile
  }

  const formattedDate = formatDate(post.publishedAt)

  return (
    <div className="min-h-screen bg-white">
      <WelcomeNavbar showBecomeScout={true} variant="visible" />
      <main className="pt-12 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16">
          {/* Back Button */}
          <BackButton fallbackUrl="/blog" className="mb-8 md:mb-10 text-sm text-gray-600 hover:text-black transition-colors" />

          {/* Edit Button (for author only) */}
          {isAuthor && (
            <div className="mb-4">
              <BlogPostEditButton slug={post.slug} />
            </div>
          )}

          {/* Header Image */}
          <div className="relative w-full h-48 sm:h-64 md:h-96 mb-6 md:mb-8 rounded-lg overflow-hidden">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
              priority
              unoptimized
            />
          </div>

          {/* Article Header */}
          <header className="mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal text-black mb-6 md:mb-4 leading-tight">
              {post.title}
            </h1>
            
            {/* Author and Date */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 flex-wrap">
              <span className="text-gray-500 whitespace-nowrap">Written by</span>
              {authorProfile?.username ? (
                <Link 
                  href={`/${authorProfile.username}`}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity flex-shrink-0"
                >
                  {authorProfile.avatar_url && isMeaningfulAvatar(authorProfile.avatar_url) ? (
                    <Image
                      src={authorProfile.avatar_url}
                      alt={authorProfile.full_name || post.author}
                      width={20}
                      height={20}
                      className="rounded-full object-cover flex-shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${getGradientForId(authorProfile.user_id || authorProfile.id || post.author)}`}
                    >
                      {(authorProfile.full_name || post.author)?.charAt(0).toUpperCase() || 'A'}
                    </div>
                  )}
                  <span className="text-gray-700 whitespace-nowrap">{post.author}</span>
                </Link>
              ) : (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${getGradientForId(post.author)}`}
                  >
                    {post.author?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <span className="text-gray-700 whitespace-nowrap">{post.author}</span>
                </div>
              )}
              <span className="text-gray-400">•</span>
              <time dateTime={post.publishedAt} className="text-gray-500 whitespace-nowrap">
                {formattedDate}
              </time>
            </div>
          </header>

          {/* Article Content */}
          <article>
            <MarkdownContent content={post.content} />
          </article>

          {/* Interaction Footer */}
          <div className="mt-8">
            <BlogInteractionFooter
              blogId={post.id || ''}
              userId={session?.user?.id || null}
              slug={post.slug}
            />
          </div>

          {/* Related Posts or CTA */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              View All Blog Posts
            </Link>
          </div>
        </div>
      </main>
      <WelcomeFooter />
    </div>
  )
}

