import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth, handleApiError, successResponse } from '@/lib/api-helpers'

/**
 * PATCH: Toggle pin status for a blog post
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const slug = params.slug
    const body = await request.json()
    const { pinned } = body

    if (typeof pinned !== 'boolean') {
      return NextResponse.json(
        { error: 'pinned must be a boolean' },
        { status: 400 }
      )
    }

    // Verify the blog post exists and belongs to the user
    const { data: blogPost, error: blogError } = await supabase
      .from('blog_posts')
      .select('id, scout_id')
      .eq('slug', slug)
      .maybeSingle()

    if (blogError || !blogPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      )
    }

    // Check if user owns the blog post
    if (blogPost.scout_id !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to pin this blog post' },
        { status: 403 }
      )
    }

    // Update the pin status
    const { data: updatedBlog, error: updateError } = await supabase
      .from('blog_posts')
      .update({ pinned })
      .eq('id', blogPost.id)
      .select()
      .single()

    if (updateError || !updatedBlog) {
      console.error('Error updating blog pin status:', updateError)
      return handleApiError(updateError, 'Failed to update pin status')
    }

    return successResponse({ blog: updatedBlog })
  } catch (error: any) {
    console.error('Error in PATCH /api/blog/[slug]/pin:', error)
    return handleApiError(error, 'Internal server error')
  }
}

export const dynamic = 'force-dynamic'

