'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { todayString } from '@/lib/utils'
import { useBadgeToast } from '@/components/layout/BadgeToast'
import { useI18n } from '@/components/i18n/I18nProvider'

const SS_KEY = `checkin:${todayString()}`

export default function QuickCheckinButton({ initialCheckedIn }: { initialCheckedIn: boolean }) {
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { showBadges } = useBadgeToast()
  const { t } = useI18n()

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SS_KEY) === '1') setCheckedIn(true)
    } catch {}
  }, [])

  if (checkedIn) {
    return (
      <div className="bg-white rounded-2xl px-5 py-4 shadow-sm flex items-center gap-3">
        <span className="text-xl">✅</span>
        <span className="text-sm font-semibold text-gray-800">{t('checkin.quickDone')}</span>
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
      try { sessionStorage.setItem(SS_KEY, '1') } catch {}
      setCheckedIn(true)
      if (data.badges_unlocked?.length) showBadges(data.badges_unlocked)
      router.refresh()
    } else {
      const data = await res.json()
      if (data.error?.includes('已經簽到')) {
        try { sessionStorage.setItem(SS_KEY, '1') } catch {}
        setCheckedIn(true)
        router.refresh()
      }
    }
  }

  return (
    <div className="animated-border rounded-2xl">
      <button
        onClick={handleCheckin}
        disabled={loading}
        className="w-full bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 rounded-[14px] px-5 py-4 text-sm font-semibold hover:brightness-95 transition-[filter] disabled:opacity-50"
      >
        {loading ? t('checkin.checkingIn') : t('checkin.quickButton')}
      </button>
    </div>
  )
}
