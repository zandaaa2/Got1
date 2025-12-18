import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/api-helpers'
import { jsPDF } from 'jspdf'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }
    const { session, supabase } = authResult

    // Handle both Promise and direct params (Next.js 14+ uses Promise)
    const resolvedParams = params instanceof Promise ? await params : params
    const evaluationId = resolvedParams.id

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
    console.error('PDF download error:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return handleApiError(error, 'Failed to download PDF')
  }
}

function generateEvaluationPDF(
  evaluation: any,
  scoutProfile: any,
  playerProfile: any
): Promise<NextResponse> {
  try {
    // Create new PDF document (letter size, portrait orientation)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 50
    const contentWidth = pageWidth - (margin * 2)
    let yPosition = margin

    // Helper function to add text with word wrapping
    const addText = (text: string, fontSize: number, x: number, y: number, maxWidth: number, align: 'left' | 'center' | 'right' = 'left') => {
      doc.setFontSize(fontSize)
      const lines = doc.splitTextToSize(text, maxWidth)
      doc.text(lines, x, y, { align })
      return lines.length * (fontSize * 1.2) // Return height used
    }

    // Title
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    const titleY = yPosition + 20
    doc.text('Evaluation Report', pageWidth / 2, titleY, { align: 'center' })
    yPosition = titleY + 30

    // Date
    const completedDate = evaluation.completed_at
      ? new Date(evaluation.completed_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'N/A'
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Completed: ${completedDate}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 40

    // Scout Profile Card
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Scout', margin, yPosition)
    yPosition += 25
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    yPosition += addText(`Name: ${scoutProfile.full_name || 'N/A'}`, 11, margin, yPosition, contentWidth)
    if (scoutProfile.position) {
      yPosition += addText(`Position: ${scoutProfile.position}`, 11, margin, yPosition, contentWidth)
    }
    if (scoutProfile.organization) {
      yPosition += addText(`Organization: ${scoutProfile.organization}`, 11, margin, yPosition, contentWidth)
    }
    if (scoutProfile.bio) {
      yPosition += 15
      doc.setFont('helvetica', 'bold')
      yPosition += addText('Bio:', 11, margin, yPosition, contentWidth)
      doc.setFont('helvetica', 'normal')
      yPosition += addText(scoutProfile.bio, 11, margin, yPosition, contentWidth)
    }
    yPosition += 30

    // Check if we need a new page
    if (yPosition > pageHeight - 100) {
      doc.addPage()
      yPosition = margin
    }

    // Player Profile Card
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Player', margin, yPosition)
    yPosition += 25
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    yPosition += addText(`Name: ${playerProfile.full_name || 'N/A'}`, 11, margin, yPosition, contentWidth)
    if (playerProfile.position) {
      yPosition += addText(`Position: ${playerProfile.position}`, 11, margin, yPosition, contentWidth)
    }
    if (playerProfile.school) {
      yPosition += addText(`School: ${playerProfile.school}`, 11, margin, yPosition, contentWidth)
    }
    if (playerProfile.graduation_year) {
      yPosition += addText(`Graduation Year: ${playerProfile.graduation_year}`, 11, margin, yPosition, contentWidth)
    }
    if (playerProfile.state) {
      yPosition += addText(`State: ${playerProfile.state}`, 11, margin, yPosition, contentWidth)
    }
    if (playerProfile.classification) {
      yPosition += addText(`Classification: ${playerProfile.classification}`, 11, margin, yPosition, contentWidth)
    }
    if (playerProfile.bio) {
      yPosition += 15
      doc.setFont('helvetica', 'bold')
      yPosition += addText('Bio:', 11, margin, yPosition, contentWidth)
      doc.setFont('helvetica', 'normal')
      yPosition += addText(playerProfile.bio, 11, margin, yPosition, contentWidth)
    }
    yPosition += 30

    // Check if we need a new page
    if (yPosition > pageHeight - 100) {
      doc.addPage()
      yPosition = margin
    }

    // Evaluation Notes
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Evaluation', margin, yPosition)
    yPosition += 25
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    if (evaluation.notes) {
      yPosition += addText(evaluation.notes, 11, margin, yPosition, contentWidth)
    } else {
      yPosition += addText('No evaluation notes available.', 11, margin, yPosition, contentWidth)
    }
    yPosition += 40

    // Check if we need a new page for CTA
    if (yPosition > pageHeight - 150) {
      doc.addPage()
      yPosition = margin
    }

    // Call to Action
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Join Got1', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 25
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    yPosition += addText(
      'Are you a player or parent looking for professional evaluations? Join Got1 to connect with experienced scouts and get detailed feedback on your performance.',
      11,
      pageWidth / 2,
      yPosition,
      contentWidth,
      'center'
    )
    yPosition += 20
    yPosition += addText(
      'Are you a scout looking to evaluate talented athletes? Join Got1 to build your reputation and help players reach their potential.',
      11,
      pageWidth / 2,
      yPosition,
      contentWidth,
      'center'
    )
    yPosition += 20
    doc.setFont('helvetica', 'bold')
    addText('Visit got1.app to get started today!', 11, pageWidth / 2, yPosition, contentWidth, 'center')

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const fileName = `evaluation-${evaluation.id}-${new Date().toISOString().split('T')[0]}.pdf`

    return Promise.resolve(
      new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      })
    )
  } catch (error) {
    return Promise.reject(error)
  }
}
