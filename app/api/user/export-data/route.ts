import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = session.user.id
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'json' // 'json' or 'pdf'

    // Fetch all user data
    const [profileResult, evaluationsResult, scoutApplicationResult] = await Promise.all([
      // Profile data
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single(),
      
      // Evaluations (both as player and scout)
      supabase
        .from('evaluations')
        .select('*')
        .or(`player_id.eq.${userId},scout_id.eq.${userId}`),
      
      // Scout application (if exists)
      supabase
        .from('scout_applications')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

    // Compile user data - include errors if any occurred
    const userData = {
      exportDate: new Date().toISOString(),
      userId: userId,
      email: session.user.email,
      authMetadata: {
        createdAt: session.user.created_at,
        lastSignIn: session.user.last_sign_in_at,
        emailVerified: session.user.email_confirmed_at ? true : false,
      },
      profile: profileResult.data || null,
      evaluations: evaluationsResult.data || [],
      scoutApplication: scoutApplicationResult.data || null,
      errors: {
        profile: profileResult.error ? profileResult.error.message : null,
        evaluations: evaluationsResult.error ? evaluationsResult.error.message : null,
        scoutApplication: scoutApplicationResult.error ? scoutApplicationResult.error.message : null,
      },
    }

    // Log errors but still return data
    if (profileResult.error) {
      console.error('Error fetching profile:', profileResult.error)
    }
    if (evaluationsResult.error) {
      console.error('Error fetching evaluations:', evaluationsResult.error)
    }
    if (scoutApplicationResult.error) {
      console.error('Error fetching scout application:', scoutApplicationResult.error)
    }

    // Return PDF or JSON based on format parameter
    if (format === 'pdf') {
      return await generatePDF(userData)
    } else {
      // Return as JSON
      return new NextResponse(JSON.stringify(userData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="got1-data-export-${new Date().toISOString().split('T')[0]}.json"`,
        },
      })
    }
  } catch (error: any) {
    console.error('Error exporting user data:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to export data' },
      { status: 500 }
    )
  }
}

function generatePDF(userData: any): Promise<NextResponse> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 })
      const chunks: Buffer[] = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        resolve(
          new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="got1-data-export-${new Date().toISOString().split('T')[0]}.pdf"`,
            },
          })
        )
      })
      doc.on('error', reject)

      // PDF Content
      doc.fontSize(20).text('Got1 Data Export', { align: 'center' })
      doc.moveDown()
      doc.fontSize(12).text(`Export Date: ${new Date(userData.exportDate).toLocaleString()}`, { align: 'center' })
      doc.moveDown(2)

      // Account Information
      doc.fontSize(16).text('Account Information', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(11)
      doc.text(`User ID: ${userData.userId}`)
      doc.text(`Email: ${userData.email || 'N/A'}`)
      doc.text(`Account Created: ${userData.authMetadata.createdAt ? new Date(userData.authMetadata.createdAt).toLocaleString() : 'N/A'}`)
      doc.text(`Last Sign In: ${userData.authMetadata.lastSignIn ? new Date(userData.authMetadata.lastSignIn).toLocaleString() : 'N/A'}`)
      doc.text(`Email Verified: ${userData.authMetadata.emailVerified ? 'Yes' : 'No'}`)
      doc.moveDown()

      // Profile Information
      if (userData.profile) {
        doc.fontSize(16).text('Profile Information', { underline: true })
        doc.moveDown(0.5)
        doc.fontSize(11)
        doc.text(`Full Name: ${userData.profile.full_name || 'N/A'}`)
        doc.text(`Role: ${userData.profile.role || 'N/A'}`)
        if (userData.profile.position) doc.text(`Position: ${userData.profile.position}`)
        if (userData.profile.organization) doc.text(`Organization: ${userData.profile.organization}`)
        if (userData.profile.school) doc.text(`School: ${userData.profile.school}`)
        if (userData.profile.graduation_year) doc.text(`Graduation Year: ${userData.profile.graduation_year}`)
        if (userData.profile.bio) {
          doc.moveDown(0.5)
          doc.text('Bio:', { underline: true })
          doc.text(userData.profile.bio, { 
            align: 'justify',
            width: 500,
            ellipsis: true
          })
        }
        doc.moveDown()
      }

      // Evaluations
      if (userData.evaluations && userData.evaluations.length > 0) {
        doc.fontSize(16).text(`Evaluations (${userData.evaluations.length})`, { underline: true })
        doc.moveDown(0.5)
        doc.fontSize(11)
        
        userData.evaluations.forEach((evaluation: any, index: number) => {
          if (index > 0) doc.moveDown()
          doc.text(`Evaluation ${index + 1}:`, { underline: true })
          doc.text(`  Status: ${evaluation.status || 'N/A'}`)
          doc.text(`  Price: $${evaluation.price || '0.00'}`)
          doc.text(`  Created: ${evaluation.created_at ? new Date(evaluation.created_at).toLocaleString() : 'N/A'}`)
          if (evaluation.completed_at) doc.text(`  Completed: ${new Date(evaluation.completed_at).toLocaleString()}`)
          if (evaluation.notes) {
            doc.moveDown(0.3)
            doc.text(`  Notes:`, { underline: true })
            doc.text(evaluation.notes, {
              indent: 20,
              width: 480,
              ellipsis: true
            })
          }
        })
        doc.moveDown()
      } else {
        doc.fontSize(16).text('Evaluations', { underline: true })
        doc.moveDown(0.5)
        doc.fontSize(11).text('No evaluations found.')
        doc.moveDown()
      }

      // Scout Application
      if (userData.scoutApplication) {
        doc.fontSize(16).text('Scout Application', { underline: true })
        doc.moveDown(0.5)
        doc.fontSize(11)
        doc.text(`Status: ${userData.scoutApplication.status || 'N/A'}`)
        doc.text(`Current Workplace: ${userData.scoutApplication.current_workplace || 'N/A'}`)
        doc.text(`Current Position: ${userData.scoutApplication.current_position || 'N/A'}`)
        if (userData.scoutApplication.work_history) {
          doc.moveDown(0.5)
          doc.text('Work History:', { underline: true })
          doc.text(userData.scoutApplication.work_history, { 
            align: 'justify',
            width: 500,
            ellipsis: true
          })
        }
        if (userData.scoutApplication.additional_info) {
          doc.moveDown(0.5)
          doc.text('Additional Information:', { underline: true })
          doc.text(userData.scoutApplication.additional_info, { 
            align: 'justify',
            width: 500,
            ellipsis: true
          })
        }
        doc.moveDown()
      }

      // Footer
      doc.moveDown(2)
      doc.fontSize(10)
      doc.text('This document contains your personal data exported from Got1.', { align: 'center' })
      doc.text('Generated on ' + new Date().toLocaleString(), { align: 'center' })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

