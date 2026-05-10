import type { Metadata, Viewport } from 'next'
import { LXGW_WenKai_TC } from 'next/font/google'
import './globals.css'

const wenkai = LXGW_WenKai_TC({
  weight: ['300', '400', '700'],
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Sproutiv',
  applicationName: 'Sproutiv',
  description: '每天讀聖經，一起成長',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Sproutiv',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className={`h-full ${wenkai.className}`}>
      <body className="h-full">{children}</body>
    </html>
  )
}
