import WelcomeNavbar from '@/components/welcome/WelcomeNavbar'
import WelcomeFooter from '@/components/welcome/WelcomeFooter'
import Link from 'next/link'
import { getAllBlogPosts } from '@/lib/blog-posts'
// Simple date formatting function
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
import Image from 'next/image'

export default async function BlogPage() {
  const blogPosts = await getAllBlogPosts()

  return (
    <div className="min-h-screen bg-white">
      <WelcomeNavbar showBecomeScout={true} variant="visible" />
      <main className="pt-12 pb-12">
        <div className="max-w-4xl mx-auto px-8 sm:px-12 lg:px-16">
          <h1 className="text-2xl md:text-3xl font-normal text-black mb-8">
            Blog
          </h1>

          <div className="space-y-8">
            {blogPosts.map((post) => {
              const formattedDate = formatDate(post.publishedAt)
              
              return (
                <article key={post.slug} className="border-b border-gray-200 pb-8 last:border-b-0">
                  <Link href={`/blog/${post.slug}`} className="block group">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Thumbnail Image */}
                      <div className="relative w-full md:w-48 h-32 md:h-24 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={post.image}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          unoptimized
                        />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <h2 className="text-xl font-normal text-black mb-2 group-hover:text-blue-600 transition-colors">
                          {post.title}
                        </h2>
                        <p className="text-gray-600 leading-relaxed mb-2">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>By {post.author}</span>
                          <span>•</span>
                          <time dateTime={post.publishedAt}>{formattedDate}</time>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              )
            })}
          </div>
        </div>
      </main>
      <WelcomeFooter />
    </div>
  )
}
