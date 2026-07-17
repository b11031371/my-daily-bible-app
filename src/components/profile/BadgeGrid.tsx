'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/components/i18n/I18nProvider'
import { localize, type Locale, type TFunc } from '@/lib/i18n'
import type { BadgeWithStatus } from '@/types/app'

const CONDITION_KEYS: Record<string, string> = {
  streak:           'badge.condStreak',
  total_checkins:   'badge.condCheckins',
  total_points:     'badge.condPoints',
  reflection_count: 'badge.condReflection',
}

function BadgeItem({ badge, t, locale }: { badge: BadgeWithStatus; t: TFunc; locale: Locale }) {
  const [show, setShow] = useState(false)

  const badgeName = localize(badge.name_i18n, locale, badge.name_zh)
  const condKey = CONDITION_KEYS[badge.condition_type]
  const unlockHint = condKey ? t(condKey, { count: badge.condition_value }) : localize(badge.description_i18n, locale, badge.description_zh)

  return (
    <div className="relative flex flex-col items-center gap-1.5 select-none">
      <div
        className={cn(
          'text-3xl cursor-pointer transition-all duration-200 rounded-full p-1.5 active:scale-95',
          badge.earned
            ? 'bg-primary-light ring-1 ring-primary hover:ring-primary hover:bg-primary-light hover:scale-110 hover:drop-shadow-[0_2px_10px_var(--color-glow)]'
            : 'opacity-30 hover:scale-105 hover:opacity-40'
        )}
        onClick={() => setShow(v => !v)}
      >
        {badge.icon}
      </div>
      <span className="text-xs text-center text-gray-600 leading-tight">{badgeName}</span>

      {show && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShow(false)} />
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-36 bg-gray-900 text-gray-50 text-xs rounded-xl px-3 py-2.5 shadow-lg text-center">
            <p className="font-semibold mb-1">{badgeName}</p>
            <p className="text-gray-300 leading-snug">
              {t('badge.unlockCondition', { hint: unlockHint })}
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        </>
      )}
    </div>
  )
}

export default function BadgeGrid({ badges }: { badges: BadgeWithStatus[] }) {
  const { t, locale } = useI18n()
  return (
    <div className="grid grid-cols-4 gap-3">
      {badges.map(b => (
        <BadgeItem key={b.id} badge={b} t={t} locale={locale} />
      ))}
    </div>
  )
}
