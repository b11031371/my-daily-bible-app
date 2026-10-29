'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Fire, Plant } from '@phosphor-icons/react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { formatDate } from '@/lib/utils'
import { cardClass } from '@/components/ui/Card'

interface Day {
  date: string
  checked: boolean
  retro: boolean
}

interface Props {
  days: Day[]
  streak: number
  children?: ReactNode
}

export default function WeeklyReadingRecord({ days, streak, children }: Props) {
  const { locale, t } = useI18n()
  // 剛簽到時（router.refresh 帶回新的 props）讓這次新簽的芽長出來、火焰跳一下、天數翻上來。
  // 比對上一次的 props，第一次畫出來不播
  const prev = useRef({ days, streak })
  const [grown, setGrown] = useState<Set<string>>(new Set())
  const [streakBumped, setStreakBumped] = useState(false)
  useEffect(() => {
    const before = new Map(prev.current.days.map(d => [d.date, d.checked]))
    const newly = days.filter(d => d.checked && before.get(d.date) === false).map(d => d.date)
    if (newly.length) setGrown(new Set(newly))
    if (streak > prev.current.streak) setStreakBumped(true)
    prev.current = { days, streak }
  }, [days, streak])
  const statusFor = (day: Day) => t(day.retro && day.checked
    ? 'notesList.retroCheckedIn'
    : day.checked ? 'notesList.checkedIn' : 'notesList.notCheckedIn')

  return (
    <section className={cardClass({ padding: 'sm', className: 'glass-card glass-blur' })} aria-label={t('notesList.lastSevenDays')}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Fire size={20} weight="fill" className={`shrink-0 text-heading ${streakBumped ? 'flame-flick' : ''}`} aria-hidden="true" />
          <span key={streak} className={`font-bold text-gray-900 ${streakBumped ? 'num-in' : ''}`}>{t('notesList.streak', { count: streak })}</span>
        </div>
        <span className="shrink-0 text-xs text-gray-400">{t('notesList.lastSevenDays')}</span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {days.map(day => (
          <div
            key={day.date}
            role="img"
            aria-label={`${formatDate(day.date, locale)}，${statusFor(day)}`}
            title={statusFor(day)}
            className="flex min-w-0 flex-col items-center gap-1.5 py-2"
          >
            <span className="flex h-10 w-10 max-w-full items-center justify-center">
              <Plant
                className={grown.has(day.date) ? 'plant-pop' : undefined}
                size={26}
                weight={day.retro || !day.checked ? 'regular' : 'fill'}
                color={day.checked ? 'var(--color-primary)' : 'var(--color-gray-300)'}
                aria-hidden="true"
              />
            </span>
            <span className="home-week-date text-xs font-bold tabular-nums tracking-wider text-gray-700">
              {Number(day.date.slice(8))}
            </span>
          </div>
        ))}
      </div>
      {children}
    </section>
  )
}
