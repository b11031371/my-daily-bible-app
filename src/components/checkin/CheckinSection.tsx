'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { todayString, formatDate, formatMonth } from '@/lib/utils'
import { POINTS_BY_DAYS_LATE } from '@/lib/points'
import StampCard from '@/components/checkin/StampCard'
import StampSlam from '@/components/checkin/StampSlam'
import TreeOfLifeStamp from '@/components/checkin/TreeOfLifeStamp'
import AnimatedNumber from '@/components/layout/AnimatedNumber'
import { COUNT_SLOT, withSlot } from '@/components/recap/CountSlot'
import { Fire, Star, Diamond, SealCheck, Plant } from '@phosphor-icons/react'
import { useBadgeToast } from '@/components/layout/BadgeToast'
import { BADGE_TOAST_GAP, useRecap } from '@/components/recap/RecapProvider'
import { useI18n } from '@/components/i18n/I18nProvider'
import type { Locale, TFunc } from '@/lib/i18n'
import Card from '@/components/ui/Card'

interface Props {
  monthlyCheckinDays: number
  monthlyMaxStreak: number
  monthlyPoints: number
  monthlyCount: number
  initialCheckins: Record<string, number>
}

export default function CheckinSection({ monthlyCheckinDays, monthlyMaxStreak, monthlyPoints, monthlyCount, initialCheckins }: Props) {
  const { locale, t } = useI18n()
  const today = todayString()
  const monthLabel = formatMonth(today, locale)
  const router = useRouter()
  const { showBadges } = useBadgeToast()
  const { checkRecap } = useRecap()
  // 記正在簽哪一天：今日按鈕和補簽列各自顯示「簽到中」，不會按補簽時今日按鈕也跟著轉
  const [loadingDate, setLoadingDate] = useState<string | null>(null)
  const loading = loadingDate !== null
  // 記這次簽的是哪一天：今天的結果顯示在今日卡片，補簽的結果留在那一列，
  // 補簽後今日卡片才不會被蓋掉、還能接著簽今天
  const [result, setResult] = useState<{ date: string; points: number; badges: string[] } | null>(null)
  const [checkinDays, setCheckinDays] = useState(monthlyCheckinDays)
  const [points, setPoints] = useState(monthlyPoints)
  const [checkedDates, setCheckedDates] = useState<Record<string, number>>(initialCheckins)
  // 記哪一天失敗，而不是單純一個 error 字串——doCheckin 同時服務今日與三個補簽
  // 列，訊息要出現在剛按下的那顆按鈕旁邊才看得懂。
  const [failedDate, setFailedDate] = useState<string | null>(null)

  const pastDays = [1, 2, 3].map(n => {
    const [y, m, d] = today.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d - n)).toISOString().split('T')[0]
  })

  async function doCheckin(date: string) {
    setLoadingDate(date)
    setFailedDate(null)
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_date: date }),
    })
    const data = await res.json()
    setLoadingDate(null)
    if (res.ok) {
      setResult({ date, points: data.points_earned, badges: data.badges_unlocked ?? [] })
      setCheckinDays(d => d + 1)
      setPoints(p => p + data.points_earned)
      setCheckedDates(prev => ({ ...prev, [date]: data.points_earned }))
      const unlocked = data.badges_unlocked?.length ?? 0
      if (unlocked) showBadges(data.badges_unlocked)
      // 每個月第一次簽到才會真的跳，該不該跳由伺服器判斷。
      // 同時解鎖徽章時往後挪，讓徽章通知先亮完。
      checkRecap(unlocked ? BADGE_TOAST_GAP : 0)
      router.refresh()
      return
    }
    // 失敗原本完全沒有出口：按鈕彈回來、畫面毫無變化，使用者只會以為沒按到。
    setFailedDate(date)
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'days', label: t('checkin.statCheckinDays'), value: withSlot(t('checkin.daysValue', { count: COUNT_SLOT }), <AnimatedNumber value={checkinDays} />), icon: <Fire size={28} weight="fill" /> },
          { key: 'streak', label: t('checkin.statMaxStreak'), value: t('checkin.daysValue', { count: monthlyMaxStreak }), icon: <Star size={28} weight="fill" /> },
          { key: 'points', label: t('checkin.statPoints'), value: <AnimatedNumber value={points} duration={700} />, icon: <Diamond size={28} weight="fill" /> },
        ].map(s => (
          <Card key={s.key} padding="sm" className="text-center">
            <div className="flex justify-center mb-1 text-heading">{s.icon}</div>
            <div className="text-lg font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Today checkin */}
      <Card>
        <p className="text-sm font-medium text-gray-500 mb-3">{t('checkin.todayLabel', { date: formatDate(today, locale) })}</p>
        {result?.date === today ? (
          <div className="done-in text-center py-3">
            <StampSlam rotate={-5} className="w-16 h-16 text-heading" />
            <p className="font-bold text-gray-900 mt-2">
              <span className="num-in [animation-delay:.3s]">{t('checkin.resultPoints', { points: result.points, days: checkinDays })}</span>
            </p>
            {result.badges.length > 0 && (
              <p className="text-sm text-accent mt-1">{t('checkin.unlockedBadges', { badges: result.badges.join(' ') })}</p>
            )}
          </div>
        ) : checkedDates[today] !== undefined ? (
          // 之前就簽過的：同一個印章、同樣的位置，只是不播動畫
          <div className="text-center py-3">
            <span aria-hidden="true" className="inline-block w-16 h-16 text-heading -rotate-[5deg]"><TreeOfLifeStamp /></span>
            <p className="font-bold text-gray-900 mt-2">{t('checkin.alreadyCheckedIn', { points: checkedDates[today] })}</p>
          </div>
        ) : (
          <>
            <div className="animated-border press-wrap rounded-xl">
              <button
                onClick={() => doCheckin(today)}
                disabled={loading}
                className="w-full btn-gradient text-gray-900 rounded-[10px] py-4 text-base font-semibold hover:brightness-95 transition-[filter] disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {loadingDate === today
                  ? <><span className="wiggle"><Plant size={20} weight="fill" /></span>{t('checkin.checkingIn')}</>
                  : <><SealCheck size={20} weight="fill" />{t('checkin.checkInNow')}</>}
              </button>
            </div>
            {failedDate === today && (
              <p role="alert" className="text-xs text-danger mt-2 text-center">{t('checkin.checkinFail')}</p>
            )}
          </>
        )}
      </Card>

      {/* Stamp card */}
      <StampCard monthlyCount={monthlyCount} monthLabel={monthLabel} />

      {/* Retro checkins */}
      <Card>
        <p className="text-sm font-semibold text-heading mb-3">{t('checkin.retroTitle')}</p>
        <div className="space-y-2">
          {pastDays.map((date, i) => {
            const daysLate = i + 1
            const pts = POINTS_BY_DAYS_LATE[daysLate]
            return (
              <RetroRow key={date} date={date} daysLate={daysLate} points={pts}
                isChecked={checkedDates[date] !== undefined} failed={failedDate === date}
                justChecked={result?.date === date} checking={loadingDate === date}
                onCheckin={() => doCheckin(date)} loading={loading} locale={locale} t={t} />
            )
          })}
        </div>
      </Card>
    </div>
  )
}

function RetroRow({ date, daysLate, points, onCheckin, loading, checking, isChecked, justChecked, failed, locale, t }: {
  date: string; daysLate: number; points: number; onCheckin: () => void; loading: boolean; checking: boolean
  isChecked: boolean; justChecked: boolean; failed: boolean; locale: Locale; t: TFunc
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm text-gray-900">{formatDate(date, locale)}</p>
        {failed
          ? <p role="alert" className="text-xs text-danger">{t('checkin.checkinFail')}</p>
          : <p className="text-xs text-gray-400">{t('checkin.daysAgo', { days: daysLate, points })}</p>}
      </div>
      {justChecked ? (
        // 剛補簽：小印章蓋在「已簽」旁邊，+N 往上飄。補簽不算進本月集點，所以集點卡不動
        <span className="done-in relative inline-flex items-center gap-1.5 text-xs text-gray-600 font-medium">
          <StampSlam rotate={4} burst={false} className="w-6 h-6 text-heading" />
          {t('checkin.checked')}
          <span aria-hidden="true" className="float-up right-0 -top-4 text-sm font-extrabold text-heading">+{points}</span>
        </span>
      ) : isChecked ? (
        // 之前補簽過的：同一個印章，只是不播動畫
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 font-medium">
          <span aria-hidden="true" className="w-6 h-6 text-heading rotate-[4deg]"><TreeOfLifeStamp /></span>
          {t('checkin.checked')}
        </span>
      ) : (
        <button
          onClick={onCheckin}
          disabled={loading}
          className="text-xs bg-primary-light text-gray-700 font-medium px-3 py-1.5 rounded-full hover:bg-primary hover:text-gray-900 active:opacity-50 transition-colors disabled:opacity-40 inline-flex items-center gap-1"
        >
          {checking && <span className="wiggle"><Plant size={12} weight="fill" /></span>}
          {t('checkin.retroButton')}
        </button>
      )}
    </div>
  )
}
