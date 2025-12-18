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

    // Generate PDF (now async)
    return await generateEvaluationPDF(evaluation, scoutProfile, playerProfile, supabase)
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

// Helper function to convert image URL to base64
async function imageToBase64(url: string, supabase: any): Promise<string | null> {
  try {
    if (!url) return null
    
    // If it's a Supabase storage URL, get the public URL
    let imageUrl = url
    if (url.includes('supabase.co/storage')) {
      // Extract bucket and path from URL
      const urlMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
      if (urlMatch) {
        const [, bucket, path] = urlMatch
        const { data } = supabase.storage.from(bucket).getPublicUrl(path)
        imageUrl = data.publicUrl
      }
    }
    
    // Fetch the image
    const response = await fetch(imageUrl)
    if (!response.ok) return null
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const mimeType = response.headers.get('content-type') || 'image/png'
    
    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    console.warn('Failed to convert image to base64:', error)
    return null
  }
}

async function generateEvaluationPDF(
  evaluation: any,
  scoutProfile: any,
  playerProfile: any,
  supabase: any
): Promise<NextResponse> {
  try {
    // Get profile images as base64
    const scoutAvatar = scoutProfile.avatar_url ? await imageToBase64(scoutProfile.avatar_url, supabase) : null
    const playerAvatar = playerProfile.avatar_url ? await imageToBase64(playerProfile.avatar_url, supabase) : null

    // Create new PDF document (letter size, portrait orientation)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 60
    const contentWidth = pageWidth - (margin * 2)
    let yPosition = margin

    // Helper function to add text with word wrapping
    const addText = (text: string, fontSize: number, x: number, y: number, maxWidth: number, align: 'left' | 'center' | 'right' = 'left', lineHeight: number = 1.4) => {
      doc.setFontSize(fontSize)
      const lines = doc.splitTextToSize(text, maxWidth)
      doc.text(lines, x, y, { align })
      return lines.length * (fontSize * lineHeight) // Return height used
    }

    // Helper to create a rounded rectangle
    const roundedRect = (x: number, y: number, w: number, h: number, r: number) => {
      doc.setLineWidth(1)
      doc.setDrawColor(220, 220, 220)
      // jsPDF roundedRect: x, y, w, h, rx, ry
      doc.roundedRect(x, y, w, h, r, r, 'S')
    }
    
    // Helper to create a filled rounded rectangle
    const filledRoundedRect = (x: number, y: number, w: number, h: number, r: number, fillColor: number[]) => {
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2])
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(1)
      doc.roundedRect(x, y, w, h, r, r, 'FD')
    }

    // Header with logo area (we'll skip logo for now, but leave space)
    yPosition += 20

    // Compact Profile Cards Section (Side by side)
    const cardWidth = (contentWidth - 20) / 2
    const cardHeight = 120
    const cardY = yPosition

    // Scout Card (Left)
    roundedRect(margin, cardY, cardWidth, cardHeight, 8)
    const scoutCardX = margin + 15
    let scoutCardY = cardY + 20
    
    // Scout Avatar
    if (scoutAvatar) {
      try {
        doc.addImage(scoutAvatar, 'PNG', scoutCardX, scoutCardY, 40, 40)
      } catch (e) {
        // If image fails, draw a circle placeholder
        doc.setFillColor(230, 230, 230)
        doc.circle(scoutCardX + 20, scoutCardY + 20, 20, 'F')
      }
    } else {
      doc.setFillColor(230, 230, 230)
      doc.circle(scoutCardX + 20, scoutCardY + 20, 20, 'F')
    }
    
    scoutCardY += 50
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(scoutProfile.full_name || 'Scout', scoutCardX, scoutCardY, { maxWidth: cardWidth - 30 })
    scoutCardY += 15
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    if (scoutProfile.organization) {
      doc.text(scoutProfile.organization, scoutCardX, scoutCardY, { maxWidth: cardWidth - 30 })
    }

    // Player Card (Right)
    roundedRect(margin + cardWidth + 20, cardY, cardWidth, cardHeight, 8)
    const playerCardX = margin + cardWidth + 35
    let playerCardY = cardY + 20
    
    // Player Avatar
    if (playerAvatar) {
      try {
        doc.addImage(playerAvatar, 'PNG', playerCardX, playerCardY, 40, 40)
      } catch (e) {
        doc.setFillColor(230, 230, 230)
        doc.circle(playerCardX + 20, playerCardY + 20, 20, 'F')
      }
    } else {
      doc.setFillColor(230, 230, 230)
      doc.circle(playerCardX + 20, playerCardY + 20, 20, 'F')
    }
    
    playerCardY += 50
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(playerProfile.full_name || 'Player', playerCardX, playerCardY, { maxWidth: cardWidth - 30 })
    playerCardY += 15
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    if (playerProfile.school) {
      doc.text(playerProfile.school, playerCardX, playerCardY, { maxWidth: cardWidth - 30 })
    }

    yPosition = cardY + cardHeight + 40

    // Date (small, subtle)
    const completedDate = evaluation.completed_at
      ? new Date(evaluation.completed_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'N/A'
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(`Completed: ${completedDate}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 30

    // EVALUATION SECTION - Most Prominent
    doc.setTextColor(0, 0, 0) // Reset to black
    
    // Evaluation header with background
    const evalHeaderY = yPosition
    filledRoundedRect(margin, evalHeaderY, contentWidth, 35, 8, [245, 245, 245])
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Evaluation', margin + 20, evalHeaderY + 23)
    
    yPosition = evalHeaderY + 50

    // Evaluation notes in a highlighted box
    if (evaluation.notes) {
      const evalTextX = margin + 20
      const evalTextY = yPosition + 25
      const evalTextWidth = contentWidth - 40
      
      // Calculate approximate height needed for evaluation text
      doc.setFontSize(13)
      const evalLines = doc.splitTextToSize(evaluation.notes, evalTextWidth)
      const estimatedHeight = Math.max(evalLines.length * 18 + 50, 200)
      const boxHeight = Math.min(estimatedHeight, pageHeight - yPosition - 120)
      
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(240, 240, 240)
      doc.setLineWidth(1.5)
      doc.roundedRect(margin, yPosition, contentWidth, boxHeight, 8, 8, 'FD')
      
      doc.setFontSize(13)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 30, 30)
      // Use better line spacing for readability
      let currentY = evalTextY
      evalLines.forEach((line: string) => {
        doc.text(line, evalTextX, currentY, { maxWidth: evalTextWidth })
        currentY += 18 // Better line spacing
      })
      
      yPosition += evalLines.length * (12 * 1.6) + 30
    } else {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150, 150, 150)
      yPosition += addText('No evaluation notes available.', 12, margin, yPosition, contentWidth)
    }

    // Check if we need a new page for CTA
    if (yPosition > pageHeight - 100) {
      doc.addPage()
      yPosition = margin
    }

    // Call to Action (smaller, at bottom)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    yPosition += 20
    addText(
      'Join Got1 to connect with scouts and players. Visit got1.app',
      10,
      pageWidth / 2,
      yPosition,
      contentWidth,
      'center'
    )

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    // Use player name for filename (sanitized)
    const playerName = (playerProfile.full_name || 'player')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const fileName = `evaluation-${playerName}.pdf`

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
