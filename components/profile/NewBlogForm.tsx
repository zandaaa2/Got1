'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import RichTextToolbar from '@/components/blog/RichTextToolbar'

interface NewBlogFormProps {
  profile: any
  userId: string
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function NewBlogForm({ profile, userId }: NewBlogFormProps) {
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [image, setImage] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [userImages, setUserImages] = useState<string[]>([])
  const [showImageSelector, setShowImageSelector] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const excerptRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
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

    // Use default image if none provided
    const finalImage = image || '/landingpage/herohorizontal.jpg'

    try {
      const slug = generateSlug(title)
      const blogData = {
        title,
        excerpt,
        content,
        image: finalImage,
        slug,
        scout_id: userId,
        author: profile.full_name || 'Scout',
        author_email: profile.email || '',
        published_at: new Date().toISOString(),
      }

      // Create new blog
      const { data: insertedData, error: insertError } = await supabase
        .from('blog_posts')
        .insert([blogData])
        .select('slug')
        .single()

      if (insertError) throw insertError
      
      // Navigate to the new blog post page
      if (insertedData?.slug) {
        router.push(`/blog/${insertedData.slug}`)
      } else {
        // Fallback to generated slug
        router.push(`/blog/${slug}`)
      }
    } catch (err: any) {
      console.error('Error saving blog:', err)
      setError(err.message || 'Failed to save blog post')
      setSaving(false)
    }
  }

  const authorName = profile.full_name || 'Scout'
  const publishDate = formatDate(new Date().toISOString())

  // Load user's uploaded images
  const loadUserImages = async () => {
    try {
      const { data: files, error } = await supabase.storage
        .from('blog-images')
        .list(`${userId}/`, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) {
        console.error('Error loading user images:', error)
        return
      }

      if (files && files.length > 0) {
        const imageUrls = files.map(file => {
          const { data: { publicUrl } } = supabase.storage
            .from('blog-images')
            .getPublicUrl(`${userId}/${file.name}`)
          return publicUrl
        })
        setUserImages(imageUrls)
      }
    } catch (err) {
      console.error('Error fetching user images:', err)
    }
  }

  // Handle image file upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB')
      return
    }

    setUploadingImage(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        if (uploadError.message.includes('Bucket') || uploadError.message.includes('not found')) {
          throw new Error('Storage bucket not configured. Please create a "blog-images" bucket in Supabase Storage.')
        }
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath)

      setImage(publicUrl)
      setShowImageSelector(false)
      // Reload user images to include the new one
      loadUserImages()
    } catch (err: any) {
      console.error('Error uploading image:', err)
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Load user images on mount
  useEffect(() => {
    loadUserImages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Auto-resize textareas
  const adjustTextareaHeight = (ref: React.RefObject<HTMLTextAreaElement>) => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = `${ref.current.scrollHeight}px`
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Medium-style Editor */}
      <div className="bg-white min-h-screen">
        {/* Header Image Section */}
        <div className="mb-8">
          {image ? (
            <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden group">
              <Image
                src={image}
                alt={title || 'Blog header'}
                fill
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => setShowImageSelector(true)}
                className="absolute top-4 right-4 px-4 py-2 bg-black/70 text-white rounded-lg hover:bg-black/90 transition-colors text-sm opacity-0 group-hover:opacity-100"
              >
                Change Image
              </button>
            </div>
          ) : (
            <div 
              onClick={() => setShowImageSelector(true)}
              className="relative w-full h-64 md:h-96 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer flex items-center justify-center bg-gray-50"
            >
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 text-sm">Click to add a header image</p>
              </div>
            </div>
          )}
          
          {/* Image Selector Modal */}
          {showImageSelector && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowImageSelector(false)}>
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-black">Select Image</h3>
                  <button
                    type="button"
                    onClick={() => setShowImageSelector(false)}
                    className="text-gray-400 hover:text-black"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="p-6">
                  {/* Upload New Image */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload New Image
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer disabled:opacity-50"
                    />
                    {uploadingImage && <p className="mt-2 text-sm text-gray-500">Uploading...</p>}
                  </div>

                  {/* Select from Existing Images */}
                  {userImages.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-4">
                        Your Images
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {userImages.map((imgUrl, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setImage(imgUrl)
                              setShowImageSelector(false)
                            }}
                            className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                              image === imgUrl 
                                ? 'border-black ring-2 ring-black' 
                                : 'border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            <Image
                              src={imgUrl}
                              alt={`Image ${index + 1}`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            {image === imgUrl && (
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {userImages.length === 0 && !uploadingImage && (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No images uploaded yet. Upload your first image above.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Author and Date Info */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-8">
          <div className="flex items-center gap-2">
            <span>By {authorName}</span>
          </div>
          <span>•</span>
          <time dateTime={new Date().toISOString()}>
            {publishDate}
          </time>
        </div>

        {/* Title - Medium Style */}
        <div className="mb-6">
          <textarea
            ref={titleRef}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              adjustTextareaHeight(titleRef)
            }}
            placeholder="Title"
            className="w-full text-3xl md:text-4xl font-normal text-black border-none outline-none resize-none overflow-hidden bg-transparent placeholder-gray-300"
            rows={1}
            style={{ minHeight: '60px' }}
            required
          />
        </div>

        {/* Excerpt - Medium Style */}
        <div className="mb-8">
          <textarea
            ref={excerptRef}
            value={excerpt}
            onChange={(e) => {
              setExcerpt(e.target.value)
              adjustTextareaHeight(excerptRef)
            }}
            placeholder="Write a brief excerpt..."
            className="w-full text-lg text-gray-600 border-none outline-none resize-none overflow-hidden bg-transparent placeholder-gray-300 italic"
            rows={2}
            style={{ minHeight: '50px' }}
            required
          />
        </div>

        {/* Content - Medium Style */}
        <div className="mb-12 border border-gray-200 rounded-lg overflow-hidden">
          <RichTextToolbar 
            textareaRef={contentRef}
            onFormat={(newValue) => {
              setContent(newValue)
              adjustTextareaHeight(contentRef)
            }}
          />
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              adjustTextareaHeight(contentRef)
            }}
            placeholder="Start writing..."
            className="w-full text-base md:text-lg text-gray-900 leading-relaxed border-none outline-none resize-none overflow-hidden bg-transparent placeholder-gray-300 whitespace-pre-wrap px-4 py-3"
            rows={20}
            style={{ minHeight: '400px' }}
            required
          />
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="px-4 py-2 text-gray-600 hover:text-black transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title || !excerpt || !content}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>
    </form>
  )
}

