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

// Helper to parse evaluation notes into sections
function parseEvaluationSections(notes: string): { [key: string]: string } {
  const sections: { [key: string]: string } = {}
  
  // Common section headers to look for
  const sectionHeaders = [
    'Evaluation Summary',
    'Physical Profile & Athleticism',
    'Physical Profile',
    'Athleticism',
    'Run Defense',
    'Pass Coverage',
    'Pass Rush / Blitz Ability',
    'Pass Rush',
    'Blitz Ability',
    'Overall Assessment',
    'Strengths',
    'Areas for Improvement',
  ]
  
  // Try to find sections by headers
  let remainingText = notes
  
  for (const header of sectionHeaders) {
    const regex = new RegExp(`(${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}):?\\s*`, 'i')
    const match = remainingText.search(regex)
    
    if (match !== -1) {
      // Found a section header
      const sectionStart = match + remainingText.substring(match).indexOf('\n')
      if (sectionStart === match - 1) {
        // No newline found, use the end of the header
        const headerEnd = match + header.length
        const sectionKey = header
        let sectionEnd = remainingText.length
        
        // Find the next section or end of text
        for (const nextHeader of sectionHeaders) {
          if (nextHeader === header) continue
          const nextRegex = new RegExp(`(${nextHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}):?\\s*`, 'i')
          const nextMatch = remainingText.substring(headerEnd).search(nextRegex)
          if (nextMatch !== -1 && nextMatch < sectionEnd) {
            sectionEnd = nextMatch
          }
        }
        
        sections[sectionKey] = remainingText.substring(headerEnd, headerEnd + sectionEnd).trim()
        remainingText = remainingText.substring(headerEnd + sectionEnd)
      } else {
        const sectionKey = header
        let sectionEnd = remainingText.length
        
        // Find the next section or end of text
        for (const nextHeader of sectionHeaders) {
          if (nextHeader === header) continue
          const nextRegex = new RegExp(`(${nextHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}):?\\s*`, 'i')
          const nextMatch = remainingText.substring(sectionStart).search(nextRegex)
          if (nextMatch !== -1 && nextMatch < sectionEnd) {
            sectionEnd = nextMatch
          }
        }
        
        sections[sectionKey] = remainingText.substring(sectionStart, sectionStart + sectionEnd).trim()
        remainingText = remainingText.substring(sectionStart + sectionEnd)
      }
    }
  }
  
  // If no sections found, use the whole text as "Evaluation Summary"
  if (Object.keys(sections).length === 0) {
    sections['Evaluation Summary'] = notes
  }
  
  return sections
}

// Helper to add circular image (masks to circle)
function addCircularImage(doc: any, imageData: string | null, x: number, y: number, radius: number, placeholderColor: number[] = [230, 230, 230]) {
  if (imageData) {
    try {
      // Create a clipping path for circle
      doc.saveGraphicsState()
      doc.ellipse(x + radius, y + radius, radius, radius, 'clip')
      doc.addImage(imageData, 'PNG', x, y, radius * 2, radius * 2)
      doc.restoreGraphicsState()
    } catch (e) {
      // If image fails, draw circle placeholder
      doc.setFillColor(placeholderColor[0], placeholderColor[1], placeholderColor[2])
      doc.circle(x + radius, y + radius, radius, 'F')
    }
  } else {
    doc.setFillColor(placeholderColor[0], placeholderColor[1], placeholderColor[2])
    doc.circle(x + radius, y + radius, radius, 'F')
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

    // Get scout application for additional credentials
    const { data: scoutApplication } = await supabase
      .from('scout_applications')
      .select('current_workplace, current_position')
      .eq('user_id', evaluation.scout_id)
      .eq('status', 'approved')
      .maybeSingle()

    // Create new PDF document (letter size, portrait orientation)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    
    // Blue gradient header (using solid blue with curved bottom)
    const headerHeight = 200
    const blueColor = [35, 61, 255] // #233dff - vivid blue
    
    // Draw blue header background
    doc.setFillColor(blueColor[0], blueColor[1], blueColor[2])
    doc.rect(0, 0, pageWidth, headerHeight, 'F')
    
    // Draw curved bottom edge using bezier curve
    const curveStartY = headerHeight - 30
    const curveEndY = headerHeight
    doc.setFillColor(255, 255, 255) // White
    doc.beginPath()
    doc.moveTo(0, curveEndY)
    doc.quadraticCurveTo(pageWidth / 2, curveStartY, pageWidth, curveEndY)
    doc.lineTo(pageWidth, pageHeight)
    doc.lineTo(0, pageHeight)
    doc.closePath()
    doc.fill()
    
    // Redraw blue with curve
    doc.setFillColor(blueColor[0], blueColor[1], blueColor[2])
    doc.beginPath()
    doc.moveTo(0, 0)
    doc.lineTo(0, curveStartY)
    doc.quadraticCurveTo(pageWidth / 2, curveEndY, pageWidth, curveStartY)
    doc.lineTo(pageWidth, 0)
    doc.closePath()
    doc.fill()

    // Player image on left (larger, ~80pt diameter)
    const playerImageRadius = 40
    const playerImageX = 60
    const playerImageY = 60
    addCircularImage(doc, playerAvatar, playerImageX, playerImageY, playerImageRadius)

    // Scout image on right (smaller, ~50pt diameter)
    const scoutImageRadius = 25
    const scoutImageX = pageWidth - 60 - (scoutImageRadius * 2)
    const scoutImageY = 40
    addCircularImage(doc, scoutAvatar, scoutImageX, scoutImageY, scoutImageRadius)

    // Player info below player image
    let playerInfoY = playerImageY + (playerImageRadius * 2) + 15
    const playerInfoX = playerImageX
    
    // Player name with graduation year
    const graduationYear = playerProfile.graduation_year ? `'${String(playerProfile.graduation_year).slice(-2)}` : ''
    const playerNameText = `${playerProfile.full_name || 'Player'}${graduationYear ? ` ${graduationYear}` : ''} - ${playerProfile.position || 'Player'}`
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(playerNameText, playerInfoX, playerInfoY, { maxWidth: 300 })
    playerInfoY += 20
    
    // School info
    const schoolText = playerProfile.school ? `${playerProfile.school} HS` : 'High School'
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(schoolText, playerInfoX, playerInfoY, { maxWidth: 300 })
    playerInfoY += 18

    // Scout info on right (white text on blue background)
    let scoutInfoY = scoutImageY + (scoutImageRadius * 2) + 10
    const scoutInfoX = scoutImageX - 100
    
    // Scout name
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255) // White text on blue
    doc.text(scoutProfile.full_name || 'Scout', scoutInfoX, scoutInfoY, { maxWidth: 200, align: 'right' })
    scoutInfoY += 16
    
    // Scout credentials (build from available data)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const credentials: string[] = []
    
    if (scoutApplication?.current_position) {
      credentials.push(scoutApplication.current_position)
    }
    if (scoutApplication?.current_workplace) {
      credentials.push(`- ${scoutApplication.current_workplace}`)
    }
    if (scoutProfile.credentials) {
      // Parse credentials if it's a string with newlines
      const credLines = scoutProfile.credentials.split('\n').filter((line: string) => line.trim())
      credentials.push(...credLines)
    }
    if (scoutProfile.organization && !credentials.some(c => c.includes(scoutProfile.organization))) {
      credentials.push(scoutProfile.organization)
    }
    
    // Display credentials (max 5 lines to fit)
    credentials.slice(0, 5).forEach((cred, index) => {
      doc.text(cred, scoutInfoX, scoutInfoY, { maxWidth: 200, align: 'right' })
      scoutInfoY += 12
    })

    // Start content area below header
    let yPosition = headerHeight + 40

    // Parse evaluation notes into sections
    const sections = evaluation.notes ? parseEvaluationSections(evaluation.notes) : {}
    
    // Display sections
    const sectionOrder = [
      'Evaluation Summary',
      'Physical Profile & Athleticism',
      'Physical Profile',
      'Athleticism',
      'Run Defense',
      'Pass Coverage',
      'Pass Rush / Blitz Ability',
      'Pass Rush',
      'Blitz Ability',
      'Overall Assessment',
      'Strengths',
      'Areas for Improvement',
    ]
    
    const contentMargin = 60
    const textWidth = pageWidth - (contentMargin * 2)
    
    sectionOrder.forEach((sectionTitle) => {
      if (sections[sectionTitle]) {
        // Check if we need a new page
        if (yPosition > pageHeight - 150) {
          doc.addPage()
          yPosition = contentMargin
        }
        
        // Section heading
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(sectionTitle, contentMargin, yPosition, { maxWidth: textWidth })
        yPosition += 20
        
        // Section content
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        const contentLines = doc.splitTextToSize(sections[sectionTitle], textWidth)
        contentLines.forEach((line: string) => {
          doc.text(line, contentMargin, yPosition, { maxWidth: textWidth })
          yPosition += 14
        })
        
        yPosition += 15 // Space between sections
      }
    })
    
    // If no sections were parsed, display notes as-is
    if (Object.keys(sections).length === 0 && evaluation.notes) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      const contentLines = doc.splitTextToSize(evaluation.notes, textWidth)
      contentLines.forEach((line: string) => {
        if (yPosition > pageHeight - 50) {
          doc.addPage()
          yPosition = contentMargin
        }
        doc.text(line, contentMargin, yPosition, { maxWidth: textWidth })
        yPosition += 14
      })
    }

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
    console.error('PDF generation error:', error)
    return Promise.reject(error)
  }
}
