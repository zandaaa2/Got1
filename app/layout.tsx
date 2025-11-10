import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthModalProvider from '@/components/providers/AuthModalProvider'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Got1 - Football Player Evaluation Marketplace',
  description: 'Connect high school football players with college scouts for film evaluations',
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

