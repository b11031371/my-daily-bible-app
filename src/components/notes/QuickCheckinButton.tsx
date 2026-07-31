'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { todayString } from '@/lib/utils'
import { useBadgeToast } from '@/components/layout/BadgeToast'
import { BADGE_TOAST_GAP, useRecap } from '@/components/recap/RecapProvider'
import { useI18n } from '@/components/i18n/I18nProvider'
import { SealCheck } from '@phosphor-icons/react'

const SS_KEY = `checkin:${todayString()}`

export default function QuickCheckinButton({ initialCheckedIn }: { initialCheckedIn: boolean }) {
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { showBadges } = useBadgeToast()
  const { checkRecap } = useRecap()
  const { t } = useI18n()

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SS_KEY) === '1') setCheckedIn(true)
    } catch {}
  }, [])

  if (checkedIn) {
    return (
      <div className="bg-surface rounded-2xl px-5 py-4 shadow-sm flex items-center gap-3">
        <SealCheck size={22} weight="fill" className="text-heading" />
        <span className="text-sm font-semibold text-heading">{t('checkin.quickDone')}</span>
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
      const unlocked = data.badges_unlocked?.length ?? 0
      if (unlocked) showBadges(data.badges_unlocked)
      // 每個月第一次簽到才會真的跳，該不該跳由伺服器判斷。同時解鎖徽章時往後挪。
      // 刻意不放進下面「已經簽到」的救援分支——那條路徑沒有真的新增簽到。
      checkRecap(unlocked ? BADGE_TOAST_GAP : 0)
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
    <div className="animated-border press-wrap rounded-2xl">
      <button
        onClick={handleCheckin}
        disabled={loading}
        className="w-full btn-gradient text-gray-900 rounded-[14px] px-5 py-4 text-sm font-semibold hover:brightness-95 transition-[filter] disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
      >
        {loading ? t('checkin.checkingIn') : <><SealCheck size={18} weight="fill" />{t('checkin.quickButton')}</>}
      </button>
    </div>
  )
}
