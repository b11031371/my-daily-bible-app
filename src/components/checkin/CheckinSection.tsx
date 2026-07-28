'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { todayString, formatDate, formatMonth } from '@/lib/utils'
import { POINTS_BY_DAYS_LATE } from '@/lib/points'
import StampCard from '@/components/checkin/StampCard'
import { Fire, Star, Diamond, Confetti, SealCheck } from '@phosphor-icons/react'
import { useBadgeToast } from '@/components/layout/BadgeToast'
import { useI18n } from '@/components/i18n/I18nProvider'
import type { Locale, TFunc } from '@/lib/i18n'

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
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ points: number; badges: string[] } | null>(null)
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
    setLoading(true)
    setFailedDate(null)
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_date: date }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setResult({ points: data.points_earned, badges: data.badges_unlocked ?? [] })
      setCheckinDays(d => d + 1)
      setPoints(p => p + data.points_earned)
      setCheckedDates(prev => ({ ...prev, [date]: data.points_earned }))
      if (data.badges_unlocked?.length) showBadges(data.badges_unlocked)
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
          { key: 'days', label: t('checkin.statCheckinDays'), value: t('checkin.daysValue', { count: checkinDays }), icon: <Fire size={28} weight="fill" /> },
          { key: 'streak', label: t('checkin.statMaxStreak'), value: t('checkin.daysValue', { count: monthlyMaxStreak }), icon: <Star size={28} weight="fill" /> },
          { key: 'points', label: t('checkin.statPoints'), value: `${points}`, icon: <Diamond size={28} weight="fill" /> },
        ].map(s => (
          <div key={s.key} className="bg-surface rounded-2xl p-4 text-center shadow-sm">
            <div className="flex justify-center mb-1 text-heading">{s.icon}</div>
            <div className="text-lg font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Today checkin */}
      <div className="bg-surface rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-medium text-gray-500 mb-3">{t('checkin.todayLabel', { date: formatDate(today, locale) })}</p>
        {result ? (
          <div className="text-center py-4">
            <Confetti size={34} weight="fill" className="text-heading mx-auto mb-2" />
            <p className="font-bold text-gray-900">{t('checkin.resultPoints', { points: result.points, days: checkinDays })}</p>
            {result.badges.length > 0 && (
              <p className="text-sm text-accent mt-1">{t('checkin.unlockedBadges', { badges: result.badges.join(' ') })}</p>
            )}
          </div>
        ) : checkedDates[today] !== undefined ? (
          <div className="flex items-center justify-center gap-1.5 py-4 text-gray-800 font-medium">
            <SealCheck size={18} weight="fill" className="text-heading" />
            {t('checkin.alreadyCheckedIn', { points: checkedDates[today] })}
          </div>
        ) : (
          <>
            <div className="animated-border press-wrap rounded-xl">
              <button
                onClick={() => doCheckin(today)}
                disabled={loading}
                className="w-full btn-gradient text-gray-900 rounded-[10px] py-4 text-base font-semibold hover:brightness-95 transition-[filter] disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {loading ? t('checkin.checkingIn') : <><SealCheck size={20} weight="fill" />{t('checkin.checkInNow')}</>}
              </button>
            </div>
            {failedDate === today && (
              <p className="text-xs text-danger mt-2 text-center">{t('checkin.checkinFail')}</p>
            )}
          </>
        )}
      </div>

      {/* Stamp card */}
      <StampCard monthlyCount={monthlyCount} monthLabel={monthLabel} />

      {/* Retro checkins */}
      <div className="bg-surface rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-semibold text-heading mb-3">{t('checkin.retroTitle')}</p>
        <div className="space-y-2">
          {pastDays.map((date, i) => {
            const daysLate = i + 1
            const pts = POINTS_BY_DAYS_LATE[daysLate]
            return (
              <RetroRow key={date} date={date} daysLate={daysLate} points={pts}
                isChecked={checkedDates[date] !== undefined} failed={failedDate === date}
                onCheckin={() => doCheckin(date)} loading={loading} locale={locale} t={t} />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RetroRow({ date, daysLate, points, onCheckin, loading, isChecked, failed, locale, t }: {
  date: string; daysLate: number; points: number; onCheckin: () => void; loading: boolean; isChecked: boolean
  failed: boolean; locale: Locale; t: TFunc
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm text-gray-900">{formatDate(date, locale)}</p>
        {failed
          ? <p className="text-xs text-danger">{t('checkin.checkinFail')}</p>
          : <p className="text-xs text-gray-400">{t('checkin.daysAgo', { days: daysLate, points })}</p>}
      </div>
      {isChecked ? (
        <span className="text-xs text-gray-600 font-medium">{t('checkin.checked')}</span>
      ) : (
        <button
          onClick={onCheckin}
          disabled={loading}
          className="text-xs bg-primary-light text-gray-700 font-medium px-3 py-1.5 rounded-full hover:bg-primary hover:text-gray-900 active:opacity-50 transition-colors disabled:opacity-40"
        >
          {t('checkin.retroButton')}
        </button>
      )}
    </div>
  )
}
