'use client'

import { useEffect, useRef, useId } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export default function Modal({ isOpen, onClose, children, title }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
      const focusTimer = window.setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus()
        } else if (dialogRef.current) {
          dialogRef.current.focus()
        }
      }, 0)
      return () => {
        window.removeEventListener('keydown', handleEscape)
        window.clearTimeout(focusTimer)
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Modal */}
      <div
        ref={dialogRef}
        className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 md:mx-0 max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${titleId}-heading` : undefined}
        aria-label={title ? undefined : 'Modal dialog'}
        tabIndex={-1}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="interactive-press absolute top-3 right-3 md:top-4 md:right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Close"
          ref={closeButtonRef}
        >
          <svg
            className="w-5 h-5 md:w-6 md:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Content */}
        <div className="p-4 md:p-8">
          {title && (
            <h2 id={`${titleId}-heading`} className="text-3xl font-bold text-black mb-8">{title}</h2>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}

