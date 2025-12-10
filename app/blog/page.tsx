import WelcomeNavbar from '@/components/welcome/WelcomeNavbar'
import WelcomeFooter from '@/components/welcome/WelcomeFooter'
import Link from 'next/link'

const blogPosts = [
  { 
    title: 'How to Get Recruited by College Scouts', 
    slug: '/blog/get-recruited',
    excerpt: 'Learn the essential steps to get your game film noticed by college scouts and advance your recruiting journey.'
  },
  { 
    title: 'What Scouts Look for in Game Film', 
    slug: '/blog/scout-requirements',
    excerpt: 'Discover what college scouts are actually looking for when they review your game film and how to present yourself effectively.'
  },
  { 
    title: 'Understanding the Recruiting Process', 
    slug: '/blog/recruiting-process',
    excerpt: 'A comprehensive guide to understanding how college football recruiting works and how to navigate the process successfully.'
  },
]

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <WelcomeNavbar showBecomeScout={true} variant="visible" />
      <main className="pt-12 pb-12">
        <div className="max-w-4xl mx-auto px-8 sm:px-12 lg:px-16">
          <h1 className="text-2xl md:text-3xl font-normal text-black mb-8">
            Blog
          </h1>

          <div className="space-y-8">
            {blogPosts.map((post) => (
              <article key={post.slug} className="border-b border-gray-200 pb-8 last:border-b-0">
                <Link href={post.slug}>
                  <h2 className="text-xl font-normal text-black mb-3 hover:text-blue-600 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-gray-600 leading-relaxed">
                    {post.excerpt}
                  </p>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </main>
      <WelcomeFooter />
    </div>
  )
}
