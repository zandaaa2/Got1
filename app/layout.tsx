import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthModalProvider from '@/components/providers/AuthModalProvider'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ 
  subsets: ['latin'], 
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://got1.app'),
  title: {
    default: 'Got1',
    template: '%s | Got1',
  },
  description: 'Verified college scouts providing fast feedback for high school football players.',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/got1app.png', type: 'image/png', sizes: 'any' },
      { url: '/got1app.png', type: 'image/png', sizes: '32x32' },
      { url: '/got1app.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [
      { url: '/got1app.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/safari-pinned-tab.svg', color: '#0B63F6' },
    ],
  },
  manifest: '/site.webmanifest',
  themeColor: '#0B63F6',
  openGraph: {
    title: 'Got1',
    description: 'Verified college scouts providing fast feedback for high school football players.',
    url: 'https://got1.app',
    siteName: 'Got1',
    images: [
      { url: '/social/og-default.png?v=2', width: 1200, height: 630, alt: 'Got1 branding' },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Got1',
    description: 'Verified college scouts providing fast feedback for high school football players.',
    images: ['/social/og-default.png?v=2'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${inter.className} font-sans`}>
        <AuthModalProvider>
          {children}
        </AuthModalProvider>
        <Analytics />
        {/* Calendly popup widget script (for 30-min founder meetings) */}
        <Script
          src="https://assets.calendly.com/assets/external/widget.js"
          async
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}

