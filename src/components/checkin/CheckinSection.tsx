'use client'
import { useState } from 'react'
import { todayString, formatDateZH } from '@/lib/utils'
import { POINTS_BY_DAYS_LATE } from '@/lib/points'
import { useCheckin } from '@/hooks/useCheckin'

interface Props {
  streakCurrent: number
  streakMax: number
  totalPoints: number
}

export default function CheckinSection({ streakCurrent, streakMax, totalPoints }: Props) {
  const today = todayString()
  const { checkin, mutate } = useCheckin(today)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ points: number; streak: number; badges: string[] } | null>(null)
  const [streak, setStreak] = useState(streakCurrent)
  const [points, setPoints] = useState(totalPoints)

  const pastDays = [1, 2, 3].map(n => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString().split('T')[0]
  })

  async function doCheckin(date: string) {
    setLoading(true)
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_date: date }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setResult({ points: data.points_earned, streak: data.streak_current, badges: data.badges_unlocked ?? [] })
      setStreak(data.streak_current)
      setPoints(p => p + data.points_earned)
      mutate()
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '連續天數', value: `${streak} 天`, icon: '🔥' },
          { label: '最長連續', value: `${streakMax} 天`, icon: '⭐' },
          { label: '總積分', value: `${points}`, icon: '💎' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-lg font-bold text-[#1a1a1a]">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Today checkin */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-medium text-gray-500 mb-3">今天 · {formatDateZH(today)}</p>
        {result ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">🎉</div>
            <p className="font-bold text-[#4a7c59]">+{result.points} 分！連續 {result.streak} 天</p>
            {result.badges.length > 0 && (
              <p className="text-sm text-[#c8a84b] mt-1">解鎖徽章 {result.badges.join(' ')}</p>
            )}
          </div>
        ) : checkin ? (
          <div className="text-center py-4 text-[#4a7c59] font-medium">✅ 今日已簽到 (+{checkin.points_earned} 分)</div>
        ) : (
          <button
            onClick={() => doCheckin(today)}
            disabled={loading}
            className="w-full bg-[#4a7c59] text-white rounded-xl py-4 text-base font-semibold hover:bg-[#3d6b4a] transition-colors disabled:opacity-50"
          >
            {loading ? '簽到中...' : '✅ 立即簽到 (+10 分)'}
          </button>
        )}
      </div>

      {/* Retro checkins */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-3">補簽（積分遞減）</p>
        <div className="space-y-2">
          {pastDays.map((date, i) => {
            const daysLate = i + 1
            const pts = POINTS_BY_DAYS_LATE[daysLate]
            return (
              <RetroRow key={date} date={date} daysLate={daysLate} points={pts}
                onCheckin={() => doCheckin(date)} loading={loading} />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RetroRow({ date, daysLate, points, onCheckin, loading }: {
  date: string; daysLate: number; points: number; onCheckin: () => void; loading: boolean
}) {
  const { checkin } = useCheckin(date)
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm text-[#1a1a1a]">{formatDateZH(date)}</p>
        <p className="text-xs text-gray-400">{daysLate} 天前 · +{points} 分</p>
      </div>
      {checkin ? (
        <span className="text-xs text-[#4a7c59] font-medium">已補簽</span>
      ) : (
        <button
          onClick={onCheckin}
          disabled={loading}
          className="text-xs bg-[#f0f7f3] text-[#4a7c59] font-medium px-3 py-1.5 rounded-full hover:bg-[#4a7c59] hover:text-white transition-colors disabled:opacity-40"
        >
          補簽
        </button>
      )}
    </div>
  )
}
