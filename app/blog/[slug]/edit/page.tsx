import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { getBlogPost } from '@/lib/blog-posts'
import { notFound } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import DynamicLayout from '@/components/layout/DynamicLayout'
import BlogPostEditForm from '@/components/blog/BlogPostEditForm'
import BackButton from '@/components/shared/BackButton'

export default async function BlogPostEditPage({ params }: { params: { slug: string } }) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/blog')
  }

  // Get the blog post to check ownership
  const { data: blogData } = await supabase
    .from('blog_posts')
    .select('scout_id, author_email')
    .eq('slug', params.slug)
    .single()

  // Check if user is the author (either by scout_id or email)
  const isAuthor = blogData && (
    blogData.scout_id === session.user.id || 
    blogData.author_email === session.user.email
  )

  // Also check if user is a scout
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', session.user.id)
    .single()

  if (!isAuthor || profile?.role !== 'scout') {
    redirect('/blog')
  }

  const post = await getBlogPost(params.slug)
  
  if (!post) {
    notFound()
  }

  // Get full profile for the form
  const { data: fullProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activePage="profile" />
      <DynamicLayout header={null}>
        <main className="pt-6 md:pt-10 pb-12">
          <div className="max-w-4xl mx-auto">
            <BackButton fallbackUrl={`/blog/${params.slug}`} className="mb-6 text-sm font-medium text-gray-600 hover:text-black transition-colors" />
            <BlogPostEditForm post={post} profile={fullProfile} userId={session.user.id} />
          </div>
        </main>
      </DynamicLayout>
    </div>
  )
}

