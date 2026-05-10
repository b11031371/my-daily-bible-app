'use client'
import { useState, useRef } from 'react'
import type { BadgeWithStatus } from '@/types/app'

const CONDITION_LABELS: Record<string, (v: number) => string> = {
  streak:           v => `連續簽到 ${v} 天`,
  total_checkins:   v => `累計簽到 ${v} 次`,
  total_points:     v => `累計獲得 ${v} 積分`,
  reflection_count: v => `分享 ${v} 則反思`,
}

function BadgeItem({ badge }: { badge: BadgeWithStatus }) {
  const [show, setShow] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function startPress() {
    timer.current = setTimeout(() => setShow(true), 500)
  }

  function endPress() {
    if (timer.current) clearTimeout(timer.current)
  }

  function dismiss() {
    if (timer.current) clearTimeout(timer.current)
    setShow(false)
  }

  const unlockHint = CONDITION_LABELS[badge.condition_type]?.(badge.condition_value) ?? badge.description_zh

  return (
    <div className="relative flex flex-col items-center gap-1 select-none">
      <div
        className={`text-3xl cursor-pointer transition-transform active:scale-90 ${!badge.earned ? 'opacity-30' : ''}`}
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={dismiss}
        onTouchStart={startPress}
        onTouchEnd={endPress}
      >
        {badge.icon}
      </div>
      <span className="text-xs text-center text-gray-600 leading-tight">{badge.name_zh}</span>

      {show && (
        <>
          <div className="fixed inset-0 z-40" onClick={dismiss} />
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-36 bg-gray-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-lg text-center">
            <p className="font-semibold mb-1">{badge.name_zh}</p>
            <p className="text-white/70 leading-snug">
              {badge.earned ? '已解鎖 ✅' : `解鎖條件：${unlockHint}`}
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        </>
      )}
    </div>
  )
}

export default function BadgeGrid({ badges }: { badges: BadgeWithStatus[] }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {badges.map(b => (
        <BadgeItem key={b.id} badge={b} />
      ))}
    </div>
  )
}
