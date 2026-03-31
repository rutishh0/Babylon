import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Crunchyroll - Watch Popular Anime & Read Manga Online',
  description: 'Crunchyroll is the world\'s most popular anime brand, connecting a community of fans through the most comprehensive anime library.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#F47521',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-[#000000] text-white min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
