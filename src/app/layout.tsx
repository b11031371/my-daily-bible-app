import type { Metadata, Viewport } from 'next'
import { LXGW_WenKai_TC } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import { getLocale } from '@/lib/i18n/server'
import { getLocaleMeta } from '@/lib/i18n'
import { I18nProvider } from '@/components/i18n/I18nProvider'

const wenkai = LXGW_WenKai_TC({
  weight: ['300', '400', '700'],
  subsets: ['latin'],
  display: 'swap',
})

// 回顧手冊封面專用的兩支字型。內頁維持文楷（楷體＝手寫的骨架），封面改用明體
// 與 Garamond（＝刻印的骨架），翻開的瞬間才有「換了一個地方」的感覺。
//
// 刻意自己託管而不是 next/font/google：冷啟動時要抓的 Google 字型檔一多就不穩，
// 抓失敗整個編譯會掛，而 dev 不會重試。封面文案是固定的，所以字集算得出來——
// 裁切後兩支加起來只有 20 KB，直接進 repo，建置和啟動都不必連網。
// 重新產生的腳本見 scripts/build-cover-fonts.py。
const coverCjk = localFont({
  src: './fonts/cover-cjk.woff2',
  weight: '600',
  display: 'swap',
  variable: '--font-cover-cjk',
})

const coverLatin = localFont({
  src: './fonts/cover-latin.woff2',
  weight: '600',
  display: 'swap',
  variable: '--font-cover-latin',
})

// 分享卡片的圖是 app/opengraph-image.png（Next 的檔案慣例，會自動產生 og:image
// 與寬高/型別標籤）。og:image 需要絕對網址，所以要有 metadataBase：優先吃自己設的
// 環境變數，其次是 Vercel 的正式網域（刻意用 PRODUCTION_URL 而非 VERCEL_URL——
// 後者是每次部署的臨時網址，分享卡片不該指到那裡），本機開發才落回 localhost。
// 換自訂網域後把 NEXT_PUBLIC_SITE_URL 設好即可。
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')

const APP_NAME = 'Sproutiv'
const APP_TAGLINE = '每天讀聖經，一起成長'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: APP_NAME,
  applicationName: APP_NAME,
  description: APP_TAGLINE,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: 'default',
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  // 未登入的訪客會被 middleware 導到 /login，而 /login 也吃這份 root metadata，
  // 所以登入牆不影響 LINE/IG 等平台抓到的預覽卡片。
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_TAGLINE,
    locale: 'zh_TW',
    alternateLocale: ['en_US'],
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description: APP_TAGLINE,
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
    <html lang={htmlLang} className={`h-full ${wenkai.className} ${coverCjk.variable} ${coverLatin.variable}`} suppressHydrationWarning>
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

