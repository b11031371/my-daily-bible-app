'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { todayString } from '@/lib/utils'
import { useBadgeToast } from '@/components/layout/BadgeToast'

export default function QuickCheckinButton({ initialCheckedIn }: { initialCheckedIn: boolean }) {
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { showBadges } = useBadgeToast()

  if (checkedIn) {
    return (
      <div className="bg-white rounded-2xl px-5 py-4 shadow-sm flex items-center gap-3">
        <span className="text-xl">✅</span>
        <span className="text-sm font-semibold text-gray-800">今日已簽到</span>
      </div>
    )
  }

  async function handleCheckin() {
    setLoading(true)
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_date: todayString() }),
    })
    setLoading(false)
    if (res.ok) {
      const data = await res.json()
      setCheckedIn(true)
      if (data.badges_unlocked?.length) showBadges(data.badges_unlocked)
      router.refresh()
    }
  }

  return (
    <div className="animated-border rounded-2xl">
      <button
        onClick={handleCheckin}
        disabled={loading}
        className="w-full bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 rounded-[14px] px-5 py-4 text-sm font-semibold hover:brightness-95 transition-[filter] disabled:opacity-50"
      >
        {loading ? '簽到中...' : '✅ 今日簽到 (+10 分)'}
      </button>
    </div>
  )
}
