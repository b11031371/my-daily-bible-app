'use client'
import { useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const TABS = ['/notes', '/checkin', '/community', '/profile']
const MIN_X = 55   // minimum horizontal distance to trigger navigation
const MAX_Y = 30   // if vertical drift exceeds this, treat as scroll — do not navigate

export default function SwipeNav({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const x0 = useRef(0)
  const y0 = useRef(0)

  function onTouchStart(e: React.TouchEvent) {
    x0.current = e.touches[0].clientX
    y0.current = e.touches[0].clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - x0.current
    const dy = Math.abs(e.changedTouches[0].clientY - y0.current)

    if (dy > MAX_Y || Math.abs(dx) < MIN_X) return

    const idx = TABS.findIndex(t => pathname.startsWith(t))
    if (idx === -1) return

    if (dx < 0 && idx < TABS.length - 1) router.push(TABS[idx + 1])
    if (dx > 0 && idx > 0)               router.push(TABS[idx - 1])
  }

  return (
    <div className="flex-1" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {children}
    </div>
  )
}
