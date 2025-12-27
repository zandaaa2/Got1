import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase-admin'

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    
    const { session } = authResult

    // Check if user is the author of the blog post
    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    const { data: blogData } = await adminSupabase
      .from('blog_posts')
      .select('scout_id, author_email')
      .eq('slug', params.slug)
      .single()

    if (!blogData) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      )
    }

    // Check if user is the author (either by scout_id or email)
    const isAuthor = blogData.scout_id === session.user.id || 
                     blogData.author_email === session.user.email

    if (!isAuthor) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, excerpt, content, image } = body

    if (!title || !excerpt || !content || !image) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use admin client to update blog post
    const { data, error } = await adminSupabase
      .from('blog_posts')
      .update({
        title,
        excerpt,
        content,
        image,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', params.slug)
      .select()
      .single()

    if (error) {
      console.error('Error updating blog post:', error)
      return NextResponse.json(
        { error: 'Failed to update blog post' },
        { status: 500 }
      )
    }

    return successResponse({ post: data })
  } catch (error: any) {
    return handleApiError(error, 'Failed to update blog post')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    
    const { session } = authResult

    // Check if user is the author of the blog post
    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    const { data: blogData } = await adminSupabase
      .from('blog_posts')
      .select('scout_id, author_email')
      .eq('slug', params.slug)
      .single()

    if (!blogData) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      )
    }

    // Check if user is the author (either by scout_id or email)
    const isAuthor = blogData.scout_id === session.user.id || 
                     blogData.author_email === session.user.email

    if (!isAuthor) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete the blog post
    const { error } = await adminSupabase
      .from('blog_posts')
      .delete()
      .eq('slug', params.slug)

    if (error) {
      console.error('Error deleting blog post:', error)
      return NextResponse.json(
        { error: 'Failed to delete blog post' },
        { status: 500 }
      )
    }

    return successResponse({ message: 'Blog post deleted successfully' })
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete blog post')
  }
}

