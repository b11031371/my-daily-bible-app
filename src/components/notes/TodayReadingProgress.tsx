'use client'
import { useEffect, useState } from 'react'
import { Check } from '@phosphor-icons/react'
import { readProgress } from '@/lib/reading-progress'

interface Props {
  userId: string
  date: string
  readLabel: string
  progressLabel: string
}

/**
 * 首頁今日卡片的底部：沒讀過顯示「閱讀今日筆記 ›」，讀過換成進度條和百分比，
 * 讀完時百分比換成一個勾。進度是筆記頁存下的「最高進度」（只進不退）。
 */
export default function TodayReadingProgress({ userId, date, readLabel, progressLabel }: Props) {
  const [max, setMax] = useState(0)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const value = readProgress(userId, date).max
    setMax(value)
    // 先以 0 畫出來，下一幀再拉到實際寬度，進度條才會有長出來的過程
    const frame = requestAnimationFrame(() => setWidth(value))
    return () => cancelAnimationFrame(frame)
  }, [userId, date])

  if (max === 0) {
    return (
      <div className="flex items-center gap-1 text-sm text-black/60 font-medium">
        <span>{readLabel}</span>
        <span>›</span>
      </div>
    )
  }

  const done = max >= 100

  // 卡片底是固定的亮色漸層：進度用深咖啡色，但透明度壓低，看得出進度又不搶標題的眼；
  // 底條再淡一階。顏色都固定寫死（同 .btn-gradient 的字色），深色模式也不反轉。
  return (
    <div className="flex items-center gap-3 text-sm font-semibold text-black/60">
      <div
        role="progressbar"
        aria-label={progressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={max}
        className="h-2 flex-1 overflow-hidden rounded-full bg-[#2C1A0E]/10"
      >
        <div
          className="h-full rounded-full bg-[#2C1A0E]/35 transition-[width] duration-500 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="inline-flex min-w-[2.75rem] justify-end tabular-nums">
        {done ? (
          // 勾用卡片漸層的主題色，像在圓上挖空，看到的是卡片底色；換主題也跟著變
          <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full bg-[#2C1A0E]/35 text-[var(--color-grad-from)]">
            <Check size={12} weight="bold" />
          </span>
        ) : (
          `${max}%`
        )}
      </span>
    </div>
  )
}
