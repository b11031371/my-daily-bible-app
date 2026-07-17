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
        <meta name="theme-color" content="#FFCC66" />
        <script dangerouslySetInnerHTML={{ __html: `try{var d=document.documentElement;var s=localStorage.getItem('bible-font-size');if(s)d.style.fontSize=s;var th=localStorage.getItem('bible-theme');if(th)d.setAttribute('data-theme',th);var rv=null;if(th==='random'){rv=localStorage.getItem('bible-random');if(rv)d.style.cssText+=';'+rv;}var md=localStorage.getItem('bible-mode');if(md)d.setAttribute('data-mode',md);var TC={gold:'#FFCC66',forest:'#5BC79A',ocean:'#5CB3E6',indigo:'#8B7CE8',rose:'#F27EA8',teal:'#3FB8C4',slate:'#6E88A8'};var col=md==='dark'?'#15120D':(th==='random'&&rv?(((rv.match(/--color-primary\\s*:\\s*([^;]+)/)||[])[1])||'').trim()||'#FFCC66':(TC[th]||'#FFCC66'));var mt=document.querySelector('meta[name=\"theme-color\"]');if(!mt){mt=document.createElement('meta');mt.setAttribute('name','theme-color');document.head.appendChild(mt);}mt.setAttribute('content',col);}catch(e){}` }} />
      </head>
      <body className="h-full" suppressHydrationWarning>
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  )
}

