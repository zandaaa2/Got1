import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthModalProvider from '@/components/providers/AuthModalProvider'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://got1.app'),
  title: {
    default: 'Got1 – Verified Football Evaluations',
    template: '%s | Got1',
  },
  description: 'Verified college scouts providing fast feedback for high school football players.',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icons/icon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [
      { url: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/safari-pinned-tab.svg', color: '#0B63F6' },
    ],
  },
  manifest: '/site.webmanifest',
  themeColor: '#0B63F6',
  openGraph: {
    title: 'Got1 – Verified Football Evaluations',
    description: 'Verified college scouts providing fast feedback for high school football players.',
    url: 'https://got1.app',
    siteName: 'Got1',
    images: [
      { url: '/social/og-default.png', width: 1200, height: 630, alt: 'Got1 branding' },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Got1 – Verified Football Evaluations',
    description: 'Verified college scouts providing fast feedback for high school football players.',
    images: ['/social/og-default.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthModalProvider>
          {children}
        </AuthModalProvider>
        <Analytics />
      </body>
    </html>
  )
}

