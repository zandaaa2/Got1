'use client'

import { useRef } from 'react'

interface RichTextToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>
  onFormat: (format: string) => void
}

export default function RichTextToolbar({ textareaRef, onFormat }: RichTextToolbarProps) {
  const handleFormat = (format: string) => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    const beforeText = textarea.value.substring(0, start)
    const afterText = textarea.value.substring(end)
    
    let formattedText = ''
    let newCursorPos = start
    
    switch (format) {
      case 'h1':
        formattedText = selectedText ? `# ${selectedText}\n\n` : '# \n\n'
        newCursorPos = start + (selectedText ? formattedText.length : 2)
        break
      case 'h2':
        formattedText = selectedText ? `## ${selectedText}\n\n` : '## \n\n'
        newCursorPos = start + (selectedText ? formattedText.length : 3)
        break
      case 'h3':
        formattedText = selectedText ? `### ${selectedText}\n\n` : '### \n\n'
        newCursorPos = start + (selectedText ? formattedText.length : 4)
        break
      case 'bold':
        formattedText = selectedText ? `**${selectedText}**` : '****'
        newCursorPos = start + (selectedText ? formattedText.length : 2)
        break
      case 'italic':
        formattedText = selectedText ? `*${selectedText}*` : '**'
        newCursorPos = start + (selectedText ? formattedText.length : 1)
        break
      case 'underline':
        formattedText = selectedText ? `<u>${selectedText}</u>` : '<u></u>'
        newCursorPos = start + (selectedText ? formattedText.length : 3)
        break
      default:
        return
    }
    
    const newValue = beforeText + formattedText + afterText
    textarea.value = newValue
    textarea.focus()
    textarea.setSelectionRange(newCursorPos, newCursorPos)
    
    // Trigger onChange event
    const event = new Event('input', { bubbles: true })
    textarea.dispatchEvent(event)
    
    onFormat(newValue)
  }

  return (
    <div className="flex items-center gap-2 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      <button
        type="button"
        onClick={() => handleFormat('h1')}
        className="px-3 py-1.5 text-sm font-bold hover:bg-gray-200 rounded transition-colors"
        title="Heading 1"
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => handleFormat('h2')}
        className="px-3 py-1.5 text-sm font-bold hover:bg-gray-200 rounded transition-colors"
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => handleFormat('h3')}
        className="px-3 py-1.5 text-sm font-bold hover:bg-gray-200 rounded transition-colors"
        title="Heading 3"
      >
        H3
      </button>
      <div className="w-px h-6 bg-gray-300" />
      <button
        type="button"
        onClick={() => handleFormat('bold')}
        className="px-3 py-1.5 text-sm font-bold hover:bg-gray-200 rounded transition-colors"
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => handleFormat('italic')}
        className="px-3 py-1.5 text-sm italic hover:bg-gray-200 rounded transition-colors"
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => handleFormat('underline')}
        className="px-3 py-1.5 text-sm underline hover:bg-gray-200 rounded transition-colors"
        title="Underline"
      >
        <u>U</u>
      </button>
    </div>
  )
}

