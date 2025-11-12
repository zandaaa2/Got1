'use client'

import { useState } from 'react'
import Modal from '@/components/shared/Modal'

interface ContactCollegeModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ContactCollegeModal({ isOpen, onClose }: ContactCollegeModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [college, setCollege] = useState('')
  const [position, setPosition] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleClose = () => {
    onClose()
    setName('')
    setEmail('')
    setCollege('')
    setPosition('')
    setMessage('')
    setIsSubmitting(false)
    setIsSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !email || !message) {
      alert('Please fill in all required fields.')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch('/api/contact/college', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          college,
          position,
          message,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send message. Please try again.')
      }

      setIsSuccess(true)
    } catch (error: any) {
      alert(error.message || 'Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Contact Us">
      {isSuccess ? (
        <div className="space-y-4">
          <p className="text-black leading-relaxed">
            Thank you for reaching out! We've received your message and will get back to you soon.
          </p>
          <button
            onClick={handleClose}
            className="interactive-press w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="contact-name" className="text-sm font-semibold text-black">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg p-3 text-black focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="contact-email" className="text-sm font-semibold text-black">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg p-3 text-black focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="your.email@university.edu"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="contact-college" className="text-sm font-semibold text-black">
              College/University
            </label>
            <input
              id="contact-college"
              type="text"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-black focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Your institution name"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="contact-position" className="text-sm font-semibold text-black">
              Position
            </label>
            <input
              id="contact-position"
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-black focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g., Athletic Director, Compliance Officer"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="contact-message" className="text-sm font-semibold text-black">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              className="w-full border border-gray-300 rounded-lg p-3 text-black focus:outline-none focus:ring-2 focus:ring-black resize-none"
              placeholder="Tell us about your questions or how we can help..."
              maxLength={2000}
            />
            <p className="text-xs text-gray-500">{message.length}/2000 characters</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="interactive-press w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors disabled:opacity-60 disabled:active:scale-100"
          >
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      )}
    </Modal>
  )
}

