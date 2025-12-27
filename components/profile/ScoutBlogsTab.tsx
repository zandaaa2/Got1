'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  image: string
  published_at: string
  updated_at?: string
  created_at: string
  pinned?: boolean
}

interface ScoutBlogsTabProps {
  profile: any
  userId: string
}

export default function ScoutBlogsTab({ profile, userId }: ScoutBlogsTabProps) {
  const [blogs, setBlogs] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadBlogs()
  }, [userId])

  const loadBlogs = async () => {
    try {
      // Get current user's email to match existing blogs
      const { data: { session } } = await supabase.auth.getSession()
      const userEmail = session?.user?.email

      // Load blogs where scout_id matches OR author_email matches (for existing blogs)
      let query = supabase
        .from('blog_posts')
        .select('*')

      if (userEmail) {
        // Use or() to match either scout_id or author_email
        query = query.or(`scout_id.eq.${userId},author_email.eq.${userEmail}`)
      } else {
        // Fallback to just scout_id if no email
        query = query.eq('scout_id', userId)
      }

      const { data, error } = await query
        .order('pinned', { ascending: false, nullsFirst: false })
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // If we found blogs by email but they don't have scout_id set, update them
      if (data && data.length > 0 && userEmail) {
        const blogsToUpdate = data.filter(blog => 
          blog.author_email === userEmail && (!blog.scout_id || blog.scout_id !== userId)
        )
        
        if (blogsToUpdate.length > 0) {
          // Update scout_id for blogs that match by email
          await supabase
            .from('blog_posts')
            .update({ scout_id: userId })
            .in('id', blogsToUpdate.map(b => b.id))
          
          // Reload to get updated data
          const { data: updatedData } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('scout_id', userId)
            .order('pinned', { ascending: false, nullsFirst: false })
            .order('published_at', { ascending: false })
            .order('created_at', { ascending: false })
          
          setBlogs(updatedData || [])
          return
        }
      }
      
      setBlogs(data || [])
    } catch (error) {
      console.error('Error loading blogs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    router.push('/profile/newblog')
  }

  const handleEdit = (blog: BlogPost) => {
    setEditingBlog(blog)
    setShowCreateForm(true)
  }

  const handleDelete = async (blogId: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', blogId)
        .eq('scout_id', userId)

      if (error) throw error
      loadBlogs()
    } catch (error) {
      console.error('Error deleting blog:', error)
      alert('Failed to delete blog post')
    }
  }

  const handleTogglePin = async (blog: BlogPost) => {
    try {
      const response = await fetch(`/api/blog/${blog.slug}/pin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pinned: !blog.pinned }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to toggle pin' }))
        throw new Error(error.error || 'Failed to toggle pin')
      }

      loadBlogs()
    } catch (error: any) {
      console.error('Error toggling pin:', error)
      alert(error.message || 'Failed to toggle pin')
    }
  }

  // Only show edit form if editing an existing blog (not creating new)
  if (showCreateForm && editingBlog) {
    return (
      <BlogEditForm
        blog={editingBlog}
        profile={profile}
        userId={userId}
        onSave={(slug) => {
          setShowCreateForm(false)
          setEditingBlog(null)
          // If editing existing blog, just reload the list
          loadBlogs()
        }}
        onCancel={() => {
          setShowCreateForm(false)
          setEditingBlog(null)
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-normal text-black">My Blog Posts</h2>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          + New Blog Post
        </button>
      </div>

      {blogs.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 rounded-lg">
          <p className="text-gray-600 mb-4">You haven't written any blog posts yet.</p>
          <button
            onClick={handleCreateNew}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Create Your First Blog Post
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((blog) => (
            <div key={blog.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow relative">
              {/* Pinned Indicator */}
              {blog.pinned && (
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-xs text-gray-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                  <span>Pinned</span>
                </div>
              )}
              {/* Header Image */}
              <Link href={`/blog/${blog.slug}`} className="block group">
                <div className="relative w-full h-48 overflow-hidden bg-gray-100">
                  <Image
                    src={blog.image}
                    alt={blog.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                </div>
              </Link>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Link href={`/blog/${blog.slug}`} className="block group">
                      <h3 className="text-lg font-medium text-black mb-2 group-hover:text-blue-600 transition-colors">
                        {blog.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{blog.excerpt}</p>
                      <div className="text-xs text-gray-500">
                        {new Date(blog.published_at || blog.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* More Options Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(openMenuId === blog.id ? null : blog.id)
                        }}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="More options"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                          />
                        </svg>
                      </button>
                      {openMenuId === blog.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                            <button
                              onClick={() => {
                                handleTogglePin(blog)
                                setOpenMenuId(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              {blog.pinned ? 'Unpin from profile' : 'Pin to profile'}
                            </button>
                            <button
                              onClick={() => {
                                handleEdit(blog)
                                setOpenMenuId(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(blog.id)
                                setOpenMenuId(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface BlogEditFormProps {
  blog: BlogPost | null
  profile: any
  userId: string
  onSave: (slug?: string) => void
  onCancel: () => void
}

function BlogEditForm({ blog, profile, userId, onSave, onCancel }: BlogEditFormProps) {
  const [title, setTitle] = useState(blog?.title || '')
  const [excerpt, setExcerpt] = useState(blog?.excerpt || '')
  const [content, setContent] = useState(blog?.content || '')
  const [image, setImage] = useState(blog?.image || '/landingpage/herohorizontal.jpg')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!title || !excerpt || !content) {
      setError('Please fill in all required fields')
      setSaving(false)
      return
    }

    try {
      const slug = blog?.slug || generateSlug(title)
      const blogData = {
        title,
        excerpt,
        content,
        image,
        slug,
        scout_id: userId,
        author: profile.full_name || 'Scout',
        author_email: profile.email || '',
        published_at: blog?.published_at || new Date().toISOString(),
      }

      if (blog) {
        // Update existing blog
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({
            ...blogData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', blog.id)
          .eq('scout_id', userId)

        if (updateError) throw updateError
        // For updates, don't pass slug (will just reload list)
        onSave()
      } else {
        // Create new blog
        const { data: insertedData, error: insertError } = await supabase
          .from('blog_posts')
          .insert([blogData])
          .select('slug')
          .single()

        if (insertError) throw insertError
        
        // For new blogs, pass the slug to navigate to the blog post page
        if (insertedData?.slug) {
          onSave(insertedData.slug)
        } else {
          // Fallback to slug we generated
          onSave(slug)
        }
      }
    } catch (err: any) {
      console.error('Error saving blog:', err)
      setError(err.message || 'Failed to save blog post')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-normal text-black">
          {blog ? 'Edit Blog Post' : 'Create New Blog Post'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-600 hover:text-black transition-colors"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title *
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          required
        />
      </div>

      <div>
        <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
          Excerpt *
        </label>
        <textarea
          id="excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          required
        />
      </div>

      <div>
        <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
          Header Image URL *
        </label>
        <input
          type="text"
          id="image"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          required
        />
        {image && (
          <div className="mt-4 relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
            <Image
              src={image}
              alt="Preview"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
          Content (Markdown supported) *
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black font-mono text-sm"
          required
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : blog ? 'Update Post' : 'Publish Post'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

