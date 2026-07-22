'use client'
import { useEffect, useState } from 'react'

interface Props {
  startedAt: string | null
  limitSeconds: number
  /** 回傳校正過的伺服器時間（毫秒），倒數一律以它為基準 */
  serverNow: () => number
  onExpire?: () => void
}

// 環形倒數。剩餘時間由 startedAt + limit 反推，所以中途重新整理也接得回去。
export default function QuizTimer({ startedAt, limitSeconds, serverNow, onExpire }: Props) {
  const [remaining, setRemaining] = useState(limitSeconds)

  useEffect(() => {
    if (!startedAt) return
    const endAt = Date.parse(startedAt) + limitSeconds * 1000
    let fired = false

    const tick = () => {
      const left = Math.max(0, (endAt - serverNow()) / 1000)
      setRemaining(left)
      if (left <= 0 && !fired) {
        fired = true
        onExpire?.()
      }
    }

    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [startedAt, limitSeconds, serverNow, onExpire])

  const ratio = Math.min(Math.max(remaining / limitSeconds, 0), 1)
  const circumference = 2 * Math.PI * 28
  const seconds = Math.ceil(remaining)
  const urgent = remaining <= 5

  return (
    <div className="relative w-16 h-16 shrink-0" role="timer" aria-label={`${seconds}`}>
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-gray-100)" strokeWidth="6" />
        <circle
          cx="32" cy="32" r="28" fill="none" strokeWidth="6" strokeLinecap="round"
          stroke={urgent ? 'var(--color-danger)' : 'var(--color-primary)'}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 120ms linear' }}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums ${
          urgent ? 'text-danger' : 'text-gray-700'
        }`}
      >
        {seconds}
      </span>
    </div>
  )
}
