'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'

interface CreatePostProps {
  onPostCreated: () => void
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .eq('user_id', session.user.id)
          .maybeSingle()
        if (profile) {
          setUserProfile(profile)
        }
      }
    }
    loadProfile()
  }, [])

  // Extract video frame for thumbnail
  const extractVideoFrame = async (file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      
      const videoUrl = URL.createObjectURL(file)
      video.src = videoUrl
      
      video.onloadedmetadata = () => {
        const seekTime = Math.min(1, video.duration * 0.1)
        video.currentTime = seekTime
      }
      
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas')
          const maxWidth = 800
          const aspectRatio = video.videoHeight / video.videoWidth
          canvas.width = Math.min(video.videoWidth, maxWidth)
          canvas.height = canvas.width * aspectRatio
          
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            canvas.toBlob((blob) => {
              URL.revokeObjectURL(videoUrl)
              resolve(blob)
            }, 'image/jpeg', 0.7)
          } else {
            URL.revokeObjectURL(videoUrl)
            resolve(null)
          }
        } catch (err) {
          console.warn('Could not extract video frame:', err)
          URL.revokeObjectURL(videoUrl)
          resolve(null)
        }
      }
      
      video.onerror = () => {
        URL.revokeObjectURL(videoUrl)
        resolve(null)
      }
    })
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    setVideoFile(null)
    setVideoPreview(null)
    setVideoThumbnail(null)
    setImageFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      setError('Please select a video file')
      return
    }

    // Check video duration (max 1 minute)
    const video = document.createElement('video')
    video.preload = 'metadata'
    const videoUrl = URL.createObjectURL(file)
    video.src = videoUrl

    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(videoUrl)
        if (video.duration > 60) {
          setError('Video must be 1 minute or less')
          resolve(null)
          return
        }
        resolve(null)
      }
      video.onerror = () => {
        URL.revokeObjectURL(videoUrl)
        setError('Invalid video file')
        resolve(null)
      }
    })

    if (error) return

    setImageFile(null)
    setImagePreview(null)
    setVideoFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setVideoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Extract thumbnail
    const thumbnailBlob = await extractVideoFrame(file)
    if (thumbnailBlob) {
      const thumbnailUrl = URL.createObjectURL(thumbnailBlob)
      setVideoThumbnail(thumbnailUrl)
    }
  }

  const removeMedia = () => {
    setImageFile(null)
    setVideoFile(null)
    setImagePreview(null)
    setVideoPreview(null)
    setVideoThumbnail(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim() && !imageFile && !videoFile) {
      setError('Please add some content, an image, or a video')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('You must be signed in to post')
      }

      let imageUrl: string | null = null
      let videoUrl: string | null = null
      let videoThumbnailUrl: string | null = null

      // Upload image if present
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${session.user.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName)
        imageUrl = publicUrl
      }

      // Upload video if present
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop()
        const videoFileName = `${session.user.id}/${Date.now()}.${fileExt}`
        
        const { error: videoUploadError } = await supabase.storage
          .from('posts')
          .upload(videoFileName, videoFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (videoUploadError) throw videoUploadError

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(videoFileName)
        videoUrl = publicUrl

        // Upload thumbnail if present
        if (videoThumbnail) {
          const thumbnailBlob = await fetch(videoThumbnail).then(r => r.blob())
          const thumbnailFileName = `${session.user.id}/${Date.now()}_thumb.jpg`
          
          const { error: thumbUploadError } = await supabase.storage
            .from('posts')
            .upload(thumbnailFileName, thumbnailBlob, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/jpeg'
            })

          if (!thumbUploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('posts')
              .getPublicUrl(thumbnailFileName)
            videoThumbnailUrl = publicUrl
          }
        }
      }

      // Create post
      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          imageUrl,
          videoUrl,
          videoThumbnailUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create post')
      }

      // Reset form
      setContent('')
      removeMedia()
      onPostCreated()
    } catch (err: any) {
      console.error('Error creating post:', err)
      setError(err.message || 'Failed to create post')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full min-h-[120px] px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
          disabled={uploading}
        />

        {/* Media Preview */}
        {(imagePreview || videoPreview) && (
          <div className="relative">
            {imagePreview && (
              <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
                <button
                  type="button"
                  onClick={removeMedia}
                  className="absolute top-2 right-2 p-2 bg-black/70 text-white rounded-full hover:bg-black transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            {videoPreview && (
              <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden">
                <video src={videoPreview} controls className="w-full max-h-96" />
                <button
                  type="button"
                  onClick={removeMedia}
                  className="absolute top-2 right-2 p-2 bg-black/70 text-white rounded-full hover:bg-black transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              disabled={uploading || !!videoFile}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading || !!videoFile}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden"
              disabled={uploading || !!imageFile}
            />
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading || !!imageFile}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add video (max 1 min)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <button
            type="submit"
            disabled={uploading || (!content.trim() && !imageFile && !videoFile)}
            className="px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  )
}
