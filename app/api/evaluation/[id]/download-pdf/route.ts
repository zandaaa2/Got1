import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/api-helpers'
import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    const evaluationId = params.id

    // Get evaluation
    const { data: evaluation } = await supabase
      .from('evaluations')
      .select('*')
      .eq('id', evaluationId)
      .maybeSingle()

    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
    }

    // Only allow download for completed evaluations
    if (evaluation.status !== 'completed') {
      return NextResponse.json({ error: 'Evaluation not completed' }, { status: 400 })
    }

    // Get player profile
    const { data: playerProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', evaluation.player_id)
      .maybeSingle()

    if (!playerProfile) {
      return NextResponse.json({ error: 'Player profile not found' }, { status: 404 })
    }

    // Get scout profile
    const { data: scoutProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', evaluation.scout_id)
      .maybeSingle()

    if (!scoutProfile) {
      return NextResponse.json({ error: 'Scout profile not found' }, { status: 404 })
    }

    // Generate PDF
    return await generateEvaluationPDF(evaluation, scoutProfile, playerProfile)
  } catch (error: any) {
    return handleApiError(error, 'Failed to download PDF')
  }
}

function generateEvaluationPDF(
  evaluation: any,
  scoutProfile: any,
  playerProfile: any
): Promise<NextResponse> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
      const chunks: Buffer[] = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        const fileName = `evaluation-${evaluation.id}-${new Date().toISOString().split('T')[0]}.pdf`
        resolve(
          new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${fileName}"`,
            },
          })
        )
      })
      doc.on('error', reject)

      // Logo at top (if available)
      try {
        const logoPath = path.join(process.cwd(), 'public', 'got1-logos', 'black.png')
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 50, { width: 100, height: 30 })
          doc.moveDown(2)
        }
      } catch (logoError) {
        // If logo fails, just continue without it
        console.warn('Could not load logo:', logoError)
      }

      // Title
      doc.fontSize(24).text('Evaluation Report', { align: 'center' })
      doc.moveDown(1)

      // Date
      const completedDate = evaluation.completed_at
        ? new Date(evaluation.completed_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'N/A'
      doc.fontSize(12).text(`Completed: ${completedDate}`, { align: 'center' })
      doc.moveDown(2)

      // Scout Profile Card
      doc.fontSize(16).text('Scout', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(11)
      doc.text(`Name: ${scoutProfile.full_name || 'N/A'}`)
      if (scoutProfile.position) doc.text(`Position: ${scoutProfile.position}`)
      if (scoutProfile.organization) doc.text(`Organization: ${scoutProfile.organization}`)
      if (scoutProfile.bio) {
        doc.moveDown(0.3)
        doc.text('Bio:', { underline: true })
        doc.text(scoutProfile.bio, {
          align: 'left',
          width: 500,
        })
      }
      doc.moveDown(1.5)

      // Player Profile Card
      doc.fontSize(16).text('Player', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(11)
      doc.text(`Name: ${playerProfile.full_name || 'N/A'}`)
      if (playerProfile.position) doc.text(`Position: ${playerProfile.position}`)
      if (playerProfile.school) doc.text(`School: ${playerProfile.school}`)
      if (playerProfile.graduation_year) doc.text(`Graduation Year: ${playerProfile.graduation_year}`)
      if (playerProfile.state) doc.text(`State: ${playerProfile.state}`)
      if (playerProfile.classification) doc.text(`Classification: ${playerProfile.classification}`)
      if (playerProfile.bio) {
        doc.moveDown(0.3)
        doc.text('Bio:', { underline: true })
        doc.text(playerProfile.bio, {
          align: 'left',
          width: 500,
        })
      }
      doc.moveDown(1.5)

      // Evaluation Notes
      doc.fontSize(16).text('Evaluation', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(11)
      if (evaluation.notes) {
        doc.text(evaluation.notes, {
          align: 'left',
          width: 500,
        })
      } else {
        doc.text('No evaluation notes available.')
      }
      doc.moveDown(2)

      // Call to Action
      doc.fontSize(14).text('Join Got1', { align: 'center', underline: true })
      doc.moveDown(0.5)
      doc.fontSize(11)
      doc.text(
        'Are you a player or parent looking for professional evaluations? Join Got1 to connect with experienced scouts and get detailed feedback on your performance.',
        {
          align: 'center',
          width: 500,
        }
      )
      doc.moveDown(0.5)
      doc.text(
        'Are you a scout looking to evaluate talented athletes? Join Got1 to build your reputation and help players reach their potential.',
        {
          align: 'center',
          width: 500,
        }
      )
      doc.moveDown(0.5)
      doc.text('Visit got1.app to get started today!', {
        align: 'center',
        width: 500,
      })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
