'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

interface IntroVideoProps {
  profile: any
  onUpdate?: () => void
}

export default function IntroVideo({ profile, onUpdate }: IntroVideoProps) {
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoSize, setVideoSize] = useState<{ width: number; height: number } | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null)
  const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load video from profile when component mounts or profile changes
  useEffect(() => {
    console.log('IntroVideo: Profile changed', { 
      hasVideoUrl: !!profile?.intro_video_url, 
      videoUrl: profile?.intro_video_url 
    })
    if (profile?.intro_video_url) {
      setVideoPreview(profile.intro_video_url)
      setOriginalVideoUrl(profile.intro_video_url)
      setIsSaved(true) // Video from profile is already saved
      setIsEditing(false)
      setPendingVideoFile(null)
    } else {
      setVideoPreview(null)
      setOriginalVideoUrl(null)
      setIsSaved(false)
      setIsEditing(false)
      setPendingVideoFile(null)
    }
  }, [profile?.intro_video_url])

  // Calculate video size to fit viewport
  const calculateVideoSize = (videoWidth: number, videoHeight: number) => {
    if (!containerRef.current) return null

    // Get available viewport space (accounting for padding, margins, etc.)
    const containerRect = containerRef.current.getBoundingClientRect()
    const availableWidth = containerRect.width || window.innerWidth * 0.9
    const availableHeight = window.innerHeight * 0.7 // Leave some space for header/nav

    const videoAspectRatio = videoWidth / videoHeight
    const containerAspectRatio = availableWidth / availableHeight

    let width: number
    let height: number

    if (videoAspectRatio > containerAspectRatio) {
      // Video is wider (landscape) - constrain by width
      width = availableWidth
      height = width / videoAspectRatio
    } else {
      // Video is taller (portrait) - constrain by height
      height = availableHeight
      width = height * videoAspectRatio
    }

    return { width, height }
  }

  // Handle video loaded to calculate size that fits viewport
  const handleVideoLoaded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget
    console.log('IntroVideo: Video metadata loaded', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      aspectRatio: video.videoWidth / video.videoHeight,
    })
    
    if (video.videoWidth && video.videoHeight) {
      const size = calculateVideoSize(video.videoWidth, video.videoHeight)
      if (size) {
        setVideoSize(size)
        video.style.width = `${size.width}px`
        video.style.height = `${size.height}px`
        console.log('IntroVideo: Video sized to fit viewport', size)
      }
    }
  }

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      if (videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
        const size = calculateVideoSize(videoRef.current.videoWidth, videoRef.current.videoHeight)
        if (size && videoRef.current) {
          setVideoSize(size)
          videoRef.current.style.width = `${size.width}px`
          videoRef.current.style.height = `${size.height}px`
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [videoPreview])

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget
    const error = video.error
    console.error('IntroVideo: Video error', {
      errorCode: error?.code,
      errorMessage: error?.message,
      networkState: video.networkState,
      readyState: video.readyState,
      src: video.src,
      errorDetails: {
        MEDIA_ERR_ABORTED: 1,
        MEDIA_ERR_NETWORK: 2,
        MEDIA_ERR_DECODE: 3,
        MEDIA_ERR_SRC_NOT_SUPPORTED: 4
      }[error?.code || 0]
    })
    
    if (error) {
      let errorMsg = 'Video failed to load. '
      switch (error.code) {
        case 1:
          errorMsg += 'The video loading was aborted.'
          break
        case 2:
          errorMsg += 'Network error while loading video. Check CORS settings or network connection.'
          break
        case 3:
          errorMsg += 'Video decoding error. The file may be corrupted or in an unsupported format.'
          break
        case 4:
          errorMsg += 'Video format not supported. Try converting to MP4.'
          break
        default:
          errorMsg += `Error code: ${error.code}`
      }
      setError(errorMsg)
    }
  }

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type - accept video files and common video extensions
    const validVideoTypes = ['video/', 'video/quicktime', 'video/x-msvideo']
    const validExtensions = ['.mov', '.mp4', '.avi', '.webm', '.mkv', '.m4v']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    const isValidType = file.type && validVideoTypes.some(type => file.type.startsWith(type))
    const isValidExtension = validExtensions.includes(fileExtension)
    
    if (!isValidType && !isValidExtension) {
      setError('Please select a video file (MP4, MOV, AVI, WebM, etc.)')
      return
    }

    // Validate file size (max 100MB as a reasonable limit for 1 minute)
    if (file.size > 100 * 1024 * 1024) {
      setError('Video must be less than 100MB')
      return
    }

    // Try to validate video duration (1 minute = 60 seconds)
    // If metadata can't be read, we'll still allow upload but show a warning
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true // Mute to allow autoplay for metadata loading
    
    const videoUrl = URL.createObjectURL(file)
    video.src = videoUrl
    
    // Create a promise that resolves when metadata is loaded, or resolves with null if it fails
    const loadMetadata = new Promise<number | null>((resolve) => {
      const timeout = setTimeout(() => {
        window.URL.revokeObjectURL(videoUrl)
        resolve(null) // Timeout - can't read metadata, but allow upload
      }, 5000) // 5 second timeout
      
      video.onloadedmetadata = () => {
        clearTimeout(timeout)
        const duration = video.duration
        window.URL.revokeObjectURL(videoUrl)
        
        if (isNaN(duration) || !isFinite(duration)) {
          resolve(null) // Can't read duration, but allow upload
          return
        }
        
        resolve(duration)
      }
      
      video.onerror = () => {
        clearTimeout(timeout)
        window.URL.revokeObjectURL(videoUrl)
        resolve(null) // Error reading file, but allow upload anyway
      }
    })

    try {
      const duration = await loadMetadata
      
      if (duration !== null) {
        // We successfully read the duration, validate it
        if (duration > 60) {
          setError(`Video is ${Math.ceil(duration)} seconds long. Video must be 1 minute (60 seconds) or less.`)
          setVideoPreview(null) // Clear any preview if validation fails
          return
        }
        // Duration is valid, clear any previous errors
        setError(null)
      } else {
        // Couldn't read metadata - show warning but allow upload
        setError('Note: Could not verify video duration. Please ensure your video is 1 minute or less.')
      }

      // Create preview only after validation passes
      const previewUrl = URL.createObjectURL(file)
      setVideoPreview(previewUrl)
      setPendingVideoFile(file)
      setIsEditing(true) // Enter editing mode when video is selected
      
      // Clear the warning after validation
      if (duration === null) {
        setError(null)
      }
    } catch (err: any) {
      console.error('Video upload error:', err)
      setError(err.message || 'Failed to upload video. Please try again.')
      setVideoPreview(null) // Clear preview on error
    }
  }

  const handleSave = async () => {
    if (!pendingVideoFile) return
    
    setSaving(true)
    setError(null)
    setUploadProgress(0)
    setEstimatedTimeRemaining(null)
    
    try {
      await uploadVideo(pendingVideoFile)
      // uploadVideo will set isSaved and clear pendingVideoFile
    } catch (err: any) {
      console.error('Error saving video:', err)
      setError(err.message || 'Failed to save video. Please try again.')
    } finally {
      setSaving(false)
      setUploadProgress(0)
      setEstimatedTimeRemaining(null)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setPendingVideoFile(null)
    // Open file picker when Edit is clicked
    fileInputRef.current?.click()
  }

  const handleCancel = () => {
    setIsEditing(false)
    setPendingVideoFile(null)
    // Restore original video if it exists
    if (originalVideoUrl) {
      setVideoPreview(originalVideoUrl)
    }
  }

  const uploadVideo = async (file: File) => {
    setUploading(true)
    setError(null)
    setUploadProgress(0)
    
    const startTime = Date.now()
    const fileSize = file.size
    let lastLoaded = 0
    let lastTime = startTime

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('You must be logged in to upload a video')
      }

      // Delete old video if it exists
      if (profile?.intro_video_url) {
        try {
          const oldFileName = profile.intro_video_url.split('/').pop()?.split('?')[0]
          if (oldFileName) {
            await supabase.storage
              .from('intro-videos')
              .remove([`${session.user.id}/${oldFileName}`])
          }
        } catch (err) {
          console.warn('Could not delete old video:', err)
        }
      }

      // Generate unique filename
      // Videos are saved to: Supabase Storage bucket "intro-videos"
      // Path format: {user_id}/{timestamp}.{extension}
      // Example: "abc123-user-id/1703123456789.mov"
      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`
      const filePath = fileName

      // Simulate progress updates (Supabase doesn't provide native progress tracking)
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        // Estimate progress based on time (rough approximation)
        // Assume average upload speed of 1MB/s
        const estimatedSpeed = 1024 * 1024 // 1MB per second
        const estimatedProgress = Math.min(95, (elapsed / 1000) * estimatedSpeed / fileSize * 100)
        setUploadProgress(estimatedProgress)
        
        // Calculate estimated time remaining
        if (estimatedProgress > 0 && estimatedProgress < 95) {
          const remainingBytes = fileSize * (1 - estimatedProgress / 100)
          const remainingSeconds = Math.ceil(remainingBytes / estimatedSpeed)
          setEstimatedTimeRemaining(remainingSeconds)
        }
      }, 200)

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('intro-videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })
      
      clearInterval(progressInterval)
      setUploadProgress(100)

      if (uploadError) {
        if (uploadError.message.includes('Bucket') || uploadError.message.includes('not found') || uploadError.message.includes('does not exist')) {
          throw new Error('Storage bucket "intro-videos" not found. Please create it in Supabase Dashboard > Storage. See INTRO_VIDEO_SETUP.md for instructions.')
        }
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('intro-videos')
        .getPublicUrl(filePath)

      console.log('IntroVideo: Upload successful, updating database', {
        publicUrl,
        userId: session.user.id,
        filePath
      })

      // Update profile in database
      const { error: updateError, data: updateData } = await supabase
        .from('profiles')
        .update({ intro_video_url: publicUrl })
        .eq('user_id', session.user.id)
        .select()

      if (updateError) {
        console.error('IntroVideo: Database update error', updateError)
        throw updateError
      }

      console.log('IntroVideo: Database update successful', {
        updateData,
        updatedUrl: updateData?.[0]?.intro_video_url
      })

      // Update preview with the actual URL
      setVideoPreview(publicUrl)
      setOriginalVideoUrl(publicUrl)
      setIsSaved(true)
      setIsEditing(false)
      setPendingVideoFile(null)
      
      // Call onUpdate callback if provided
      if (onUpdate) {
        console.log('IntroVideo: Calling onUpdate callback')
        onUpdate()
      }
    } catch (err: any) {
      console.error('Error uploading video:', err)
      setError(err.message || 'Failed to upload video. Please try again.')
      setVideoPreview(null)
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your intro video?')) {
      return
    }

    setUploading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('You must be logged in')
      }

      // Delete video from storage
      if (profile?.intro_video_url) {
        const fileName = profile.intro_video_url.split('/').pop()?.split('?')[0]
        if (fileName) {
          await supabase.storage
            .from('intro-videos')
            .remove([`${session.user.id}/${fileName}`])
        }
      }

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ intro_video_url: null })
        .eq('user_id', session.user.id)

      if (updateError) {
        throw updateError
      }

      setVideoPreview(null)
      setOriginalVideoUrl(null)
      setIsSaved(false)
      setIsEditing(false)
      setPendingVideoFile(null)
      
      // Call onUpdate callback if provided
      if (onUpdate) {
        onUpdate()
      }
    } catch (err: any) {
      console.error('Error deleting video:', err)
      setError(err.message || 'Failed to delete video. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      {videoPreview ? (
        <div className="space-y-4">
          <div ref={containerRef} className="w-full flex justify-start">
            <video
              ref={videoRef}
              src={videoPreview}
              controls
              preload="metadata"
              onLoadedMetadata={handleVideoLoaded}
              onError={handleVideoError}
              onLoadStart={() => console.log('IntroVideo: Video load started', videoPreview)}
              onCanPlay={() => console.log('IntroVideo: Video can play')}
              onCanPlayThrough={() => console.log('IntroVideo: Video can play through')}
              className="rounded-lg"
              style={{ 
                display: 'block',
                ...(videoSize ? {
                  width: `${videoSize.width}px`,
                  height: `${videoSize.height}px`
                } : {
                  maxWidth: '100%'
                })
              }}
            >
              Your browser does not support the video tag.
            </video>
            {error && error.includes('Video failed to load') && (
              <p className="mt-2 text-sm text-gray-600">
                Tip: Try converting your video to MP4 format for better browser compatibility.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {isSaved && !isEditing ? (
              // After video is saved: Just "Edit" button
              <button
                onClick={handleEdit}
                disabled={uploading}
                className="interactive-press px-4 py-2 bg-gray-200 text-black rounded-lg font-medium text-sm hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Edit
              </button>
            ) : isEditing && !pendingVideoFile ? (
              // After clicking Edit: Delete Video, Cancel
              <>
                <button
                  onClick={handleDelete}
                  disabled={uploading}
                  className="interactive-press px-4 py-2 bg-gray-200 text-black rounded-lg font-medium text-sm hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Deleting...' : 'Delete Video'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={uploading}
                  className="interactive-press px-4 py-2 bg-black text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </>
            ) : isEditing && pendingVideoFile ? (
              // After selecting a new video: Delete Video, Save
              <>
                <button
                  onClick={handleDelete}
                  disabled={uploading || saving}
                  className="interactive-press px-4 py-2 bg-gray-200 text-black rounded-lg font-medium text-sm hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Deleting...' : 'Delete Video'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || uploading}
                  className="interactive-press px-4 py-2 bg-black text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : null}
          </div>
          {saving && (
            <div 
              className="mt-3"
              style={{ 
                width: videoSize ? `${videoSize.width}px` : 'auto',
                maxWidth: '100%'
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-700">Uploading video...</p>
                  <p className="text-xs text-gray-500">{Math.round(uploadProgress)}%</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-black h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {estimatedTimeRemaining !== null && (
                  <p className="text-xs text-gray-500">
                    {estimatedTimeRemaining > 0 
                      ? `~${estimatedTimeRemaining} second${estimatedTimeRemaining !== 1 ? 's' : ''} remaining`
                      : 'Almost done...'
                    }
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer transition-colors ${
            uploading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mov,.mp4,.avi,.webm,.mkv,.m4v"
            onChange={handleVideoSelect}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? (
            <div className="space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
              <p className="text-gray-600">Uploading video...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-gray-600 font-medium">Upload Video</p>
              <p className="text-gray-500 text-sm">Video must be 1 minute or less</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
