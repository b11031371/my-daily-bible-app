import type { Metadata, Viewport } from 'next'
import { LXGW_WenKai_TC } from 'next/font/google'
import './globals.css'
import { getLocale } from '@/lib/i18n/server'
import { getLocaleMeta } from '@/lib/i18n'
import { I18nProvider } from '@/components/i18n/I18nProvider'

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
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const htmlLang = getLocaleMeta(locale).htmlLang

  return (
    <html lang={htmlLang} className={`h-full ${wenkai.className}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var d=document.documentElement;var s=localStorage.getItem('bible-font-size');if(s)d.style.fontSize=s;var th=localStorage.getItem('bible-theme');if(th)d.setAttribute('data-theme',th);if(th==='random'){var rv=localStorage.getItem('bible-random');if(rv)d.style.cssText+=';'+rv;}var md=localStorage.getItem('bible-mode');if(md)d.setAttribute('data-mode',md);}catch(e){}` }} />
      </head>
      <body className="h-full" suppressHydrationWarning>
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  )
}

