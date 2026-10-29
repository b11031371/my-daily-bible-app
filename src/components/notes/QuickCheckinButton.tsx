'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { todayString } from '@/lib/utils'
import { useBadgeToast } from '@/components/layout/BadgeToast'
import { BADGE_TOAST_GAP, useRecap } from '@/components/recap/RecapProvider'
import { useI18n } from '@/components/i18n/I18nProvider'
import { Plant, SealCheck } from '@phosphor-icons/react'
import StampSlam from '@/components/checkin/StampSlam'
import TreeOfLifeStamp from '@/components/checkin/TreeOfLifeStamp'
import Card from '@/components/ui/Card'

const SS_KEY = `checkin:${todayString()}`

export default function QuickCheckinButton({ initialCheckedIn }: { initialCheckedIn: boolean }) {
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn)
  const [loading, setLoading] = useState(false)
  // 這次按下去拿到的分數；有值才播蓋章動畫，進頁面時本來就簽過的不播
  const [earned, setEarned] = useState<number | null>(null)
  const router = useRouter()
  const { showBadges } = useBadgeToast()
  const { checkRecap } = useRecap()
  const { t } = useI18n()

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SS_KEY) === '1') setCheckedIn(true)
    } catch {}
  }, [])

  if (checkedIn && earned !== null) {
    // 剛按下去成功：印章蓋在原本按鈕的位置，+N 往上飄
    return (
      <Card padding="none" className="stamp-thud done-in glass-card relative px-5 py-4 flex items-center gap-3">
        <StampSlam rotate={-6} className="w-7 h-7 text-heading" />
        <span className="text-sm font-semibold text-heading">{t('checkin.quickDone')}</span>
        <span className="ml-auto text-sm font-semibold text-heading opacity-80">{t('checkin.pointsEarned', { points: earned })}</span>
        <span aria-hidden="true" className="float-up right-5 -top-1 text-lg font-extrabold text-heading">+{earned}</span>
      </Card>
    )
  }

  if (checkedIn) {
    return (
      <Card padding="none" className="glass-card px-5 py-4 flex items-center gap-3">
        {/* 跟剛簽到時蓋下去的印章一樣，只是不播動畫 */}
        <span aria-hidden="true" className="w-7 h-7 shrink-0 text-heading -rotate-6"><TreeOfLifeStamp /></span>
        <span className="text-sm font-semibold text-heading">{t('checkin.quickDone')}</span>
      </Card>
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
      setEarned(data.points_earned)
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
    <div className="animated-border press-wrap home-checkin-button rounded-2xl">
      <button
        onClick={handleCheckin}
        disabled={loading}
        className="w-full btn-gradient text-gray-900 rounded-[14px] px-5 py-4 text-sm font-semibold hover:brightness-95 transition-[filter] disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
      >
        {loading
          ? <><span className="wiggle"><Plant size={18} weight="fill" /></span>{t('checkin.checkingIn')}</>
          : <><SealCheck size={18} weight="fill" />{t('checkin.quickButton')}</>}
      </button>
    </div>
  )
}
