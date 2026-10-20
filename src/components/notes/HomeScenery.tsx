'use client'

import { useId, useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { celestialAt, moonLitPath, moonPhaseAt, skyStateAt, type Celestial, type SkyTime } from '@/lib/sky'

interface Sky extends Celestial {
  time: SkyTime
  moonPath: string
}

function readSky(now = new Date()): Sky {
  const state = skyStateAt(now)
  const hour = now.getHours() + now.getMinutes() / 60
  return { time: state.time, ...celestialAt(hour, state), moonPath: moonLitPath(11, moonPhaseAt(now)) }
}

// 星星用固定的偽亂數排好位置：每次進首頁星空都長一樣，也不會有 SSR/CSR 不一致的問題
const STARS = (() => {
  let seed = 7
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  return Array.from({ length: 26 }, () => ({
    left: `${(3 + rnd() * 94).toFixed(1)}%`,
    top: `${(3 + rnd() * 44).toFixed(1)}%`,
    size: `${(1.2 + rnd() * 2).toFixed(1)}px`,
    delay: `${(0.6 + rnd() * 1.4).toFixed(2)}s`,
  }))
})()

/**
 * 月亮：亮面有球面明暗、幾塊淡淡的月海，明暗交界稍微柔化，外面一圈月光。
 * path 是亮面的形狀（依當天月相），月海和明暗漸層都裁在亮面裡面。
 */
function Moon({ path }: { path: string }) {
  // useId 會帶冒號之類的字元，放進 url(#…) 前先拿掉
  const id = `moon${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <>
      <div className="home-moon-glow" />
      <svg className="home-moon" viewBox="-12 -12 24 24">
        <defs>
          <radialGradient id={`${id}-shade`} cx="42%" cy="40%" r="65%">
            <stop offset="0" stopColor="#FFFBEC" />
            <stop offset="0.7" stopColor="#F4E9C8" />
            <stop offset="1" stopColor="#DCCDA6" />
          </radialGradient>
          <clipPath id={`${id}-lit`}>
            <path d={path} />
          </clipPath>
          <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.25" />
          </filter>
        </defs>
        <circle className="home-moon-dark" r="11" />
        <g clipPath={`url(#${id}-lit)`} filter={`url(#${id}-soft)`}>
          <circle r="11" fill={`url(#${id}-shade)`} />
          <g className="home-moon-maria">
            <circle cx="-3.2" cy="-3.4" r="2.6" />
            <circle cx="2.4" cy="-4.6" r="1.8" />
            <circle cx="3.6" cy="1.8" r="3" />
            <circle cx="-1.8" cy="4.2" r="1.6" />
            <circle cx="-5.4" cy="1.2" r="1.2" />
          </g>
        </g>
      </svg>
    </>
  )
}

/**
 * 首頁背景：依手機時間變化的天空與遠山，太陽／月亮沿弧線升落，
 * 山腳淡出到底色。風景鋪滿整個寬度，children 放在
 * className 指定的內容容器裡、疊在風景上面。
 *
 * 天空和山的顏色由 <html data-sky> 決定（見 globals.css），layout 的 head script 在畫面出現前
 * 就依手機時間寫好，所以伺服器直接把天空和山畫出來，第一幀的天色就是對的。
 * 太陽、月亮的位置和月相要精確的時間，掛載後才畫出來，順便播進場（從山後升起）。
 */
export default function HomeScenery({ className, children }: { className?: string; children: ReactNode }) {
  const [sky, setSky] = useState<Sky | null>(null)
  const hillFadeId = `hill${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  // 從其他分頁切回首頁時，Next 可能沿用保留下來的首頁，不會重新掛載，
  // 所以網址一變就重算一次，否則要等下一次每分鐘更新才會換天色
  const pathname = usePathname()

  // 用 layout effect：從其他分頁切回首頁時，在畫面畫出來之前就換好天色，不會閃一幀舊的
  useLayoutEffect(() => {
    const refresh = () => {
      const next = readSky()
      document.documentElement.setAttribute('data-sky', next.time)
      setSky(next)
    }
    refresh()
    // 首頁開著不關的話，太陽也要跟著走；App 從背景切回來時也馬上更新
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    const timer = setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pathname])

  // 太陽接近地平線時，山後泛一點暖光；升高後就散掉
  const horizonGlow = sky?.body === 'sun' ? Math.max(0, 1 - sky.altitude * 2.6) * 0.7 : 0

  return (
    <div className="sky-scene home-scene">
      <div className="sky-backdrop" aria-hidden="true">
        <div className="home-sky" />
        <div className="sky-stars">
          {STARS.map((s, i) => (
            <span key={i} style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay }} />
          ))}
        </div>
        {sky && (
          <>
            {/* 位置用 transform 移動（見 globals.css 的 .home-orb），--x 是水平位置 0–100 */}
            <div className="home-orb" style={{ '--x': sky.x, '--alt': sky.altitude } as CSSProperties}>
              <div className="home-orb-rise">
                {sky.body === 'sun' ? (
                  <>
                    <div className="home-sun-scatter" />
                    <div className="home-sun" />
                  </>
                ) : (
                  <Moon path={sky.moonPath} />
                )}
              </div>
            </div>
            <div className="home-glow-track" style={{ '--x': sky.x } as CSSProperties}>
              <div className="home-horizon-glow" style={{ opacity: horizonGlow }} />
            </div>
          </>
        )}
        <svg className="home-hills" viewBox="0 0 300 200" preserveAspectRatio="none">
          {/* 前山從稜線就開始往下漸變，接到 home-hill-base 的起點色，中間不會有一段平平的色塊 */}
          <defs>
            <linearGradient id={hillFadeId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--hill-front-top)' }} />
              <stop offset="1" style={{ stopColor: 'var(--hill-fade)' }} />
            </linearGradient>
          </defs>
          <path className="home-hill-back" d="M0 112 C36 88 78 76 118 98 C158 120 196 70 236 80 C266 88 288 98 300 96 V200 H0Z" />
          <path fill={`url(#${hillFadeId})`} d="M0 140 C48 120 94 134 142 126 C190 118 232 142 300 128 V200 H0Z" />
        </svg>
        <div className="home-hill-base" />
      </div>
      <div className={cn('relative', className)}>{children}</div>
    </div>
  )
}
