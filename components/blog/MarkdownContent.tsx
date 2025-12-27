'use client'

interface MarkdownContentProps {
  content: string
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  // Simple markdown parser for basic formatting
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n')
    const elements: JSX.Element[] = []
    let key = 0

    lines.forEach((line, index) => {
      // Headings
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={key++} className="text-lg sm:text-xl font-semibold text-black mt-6 mb-3">
            {parseInlineFormatting(line.substring(4))}
          </h3>
        )
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={key++} className="text-xl sm:text-2xl font-semibold text-black mt-6 mb-3">
            {parseInlineFormatting(line.substring(3))}
          </h2>
        )
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={key++} className="text-2xl sm:text-3xl font-bold text-black mt-8 mb-4">
            {parseInlineFormatting(line.substring(2))}
          </h1>
        )
      } else if (line.trim() === '') {
        // Empty line - add spacing
        elements.push(<br key={key++} />)
      } else {
        // Regular paragraph
        elements.push(
          <p key={key++} className="mb-4 leading-relaxed text-base sm:text-lg">
            {parseInlineFormatting(line)}
          </p>
        )
      }
    })

    return elements
  }

  // Parse inline formatting (bold, italic, underline) - recursive approach
  const parseInlineFormatting = (text: string): (string | JSX.Element)[] => {
    if (!text) return []
    
    const parts: (string | JSX.Element)[] = []
    let partKey = 0
    let remaining = text

    // Process in order: bold (**text**), italic (*text*), underline (<u>text</u>)
    while (remaining.length > 0) {
      // Find the earliest match
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/)
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/) // Single * not part of **
      const underlineMatch = remaining.match(/<u>(.*?)<\/u>/)
      
      type MatchType = { index: number; length: number; content: string; type: 'bold' | 'italic' | 'underline' }
      const matches: MatchType[] = []
      
      if (boldMatch && boldMatch.index !== undefined) {
        matches.push({
          index: boldMatch.index,
          length: boldMatch[0].length,
          content: boldMatch[1],
          type: 'bold',
        })
      }
      
      if (italicMatch && italicMatch.index !== undefined) {
        matches.push({
          index: italicMatch.index,
          length: italicMatch[0].length,
          content: italicMatch[1],
          type: 'italic',
        })
      }
      
      if (underlineMatch && underlineMatch.index !== undefined) {
        matches.push({
          index: underlineMatch.index,
          length: underlineMatch[0].length,
          content: underlineMatch[1],
          type: 'underline',
        })
      }

      // Find the earliest match
      const earliestMatch = matches.length > 0 
        ? matches.reduce((earliest, current) => 
            current.index < earliest.index ? current : earliest
          )
        : null

      if (earliestMatch !== null) {
        // Add text before match
        if (earliestMatch.index > 0) {
          parts.push(remaining.substring(0, earliestMatch.index))
        }
        
        // Add formatted content (recursively parse nested formatting)
        const nestedContent = parseInlineFormatting(earliestMatch.content)
        if (earliestMatch.type === 'bold') {
          parts.push(<strong key={partKey++}>{nestedContent}</strong>)
        } else if (earliestMatch.type === 'italic') {
          parts.push(<em key={partKey++}>{nestedContent}</em>)
        } else if (earliestMatch.type === 'underline') {
          parts.push(<u key={partKey++}>{nestedContent}</u>)
        }
        
        // Continue with remaining text
        remaining = remaining.substring(earliestMatch.index + earliestMatch.length)
      } else {
        // No more matches, add remaining text
        parts.push(remaining)
        break
      }
    }

    return parts.length > 0 ? parts : [text]
  }

  return (
    <div className="prose prose-sm sm:prose-lg max-w-none">
      {parseMarkdown(content)}
    </div>
  )
}

