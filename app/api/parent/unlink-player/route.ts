import { createServerClient } from '@/lib/supabase'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { player_id } = await request.json()

    if (!player_id) {
      return NextResponse.json({ error: 'player_id is required' }, { status: 400 })
    }

    console.log('🔍 API: Attempting to unlink player:', {
      parent_id: session.user.id,
      player_id: player_id,
    })

    // Use admin client to bypass RLS for the delete operation
    const adminSupabase = createAdminClient()
    
    if (!adminSupabase) {
      console.error('❌ API: Admin client not available')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Verify the relationship exists first (using admin client to ensure we can see it)
    const { data: existingLink, error: checkError } = await adminSupabase
      .from('parent_children')
      .select('id, parent_id, player_id')
      .eq('parent_id', session.user.id)
      .eq('player_id', player_id)
      .maybeSingle()

    if (checkError) {
      console.error('❌ API: Error checking existing link:', checkError)
      return NextResponse.json(
        { error: `Failed to verify relationship: ${checkError.message}` },
        { status: 500 }
      )
    }

    if (!existingLink) {
      console.log('⚠️ API: No relationship found to unlink')
      return NextResponse.json(
        { error: 'No relationship found to unlink' },
        { status: 404 }
      )
    }

    console.log('✅ API: Relationship found, proceeding with delete:', existingLink)

    // Delete the relationship using admin client to bypass RLS
    const { error: deleteError, data: deleteData } = await adminSupabase
      .from('parent_children')
      .delete()
      .eq('parent_id', session.user.id)
      .eq('player_id', player_id)
      .select()

    if (deleteError) {
      console.error('❌ API: Delete error:', deleteError)
      console.error('Error code:', deleteError.code)
      console.error('Error message:', deleteError.message)
      return NextResponse.json(
        { error: deleteError.message || 'Failed to unlink player' },
        { status: 500 }
      )
    }

    console.log('✅ API: Successfully unlinked player')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ API: Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

