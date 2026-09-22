import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

import { Toaster } from '@/components/ui/sonner'

import './globals.css'

// Cyrillic subset is required: the whole UI is in Mongolian.
const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'cyrillic'],
})

export const metadata: Metadata = {
  title: 'Cora — Админ',
  description: 'Cora брэндийн бараа, захиалга, ашгийн удирдлага',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="mn">
      <body className={`${inter.variable} antialiased`}>
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
