'use client'
import { useState, useEffect, useRef } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'

export default function CommunityInfoButton() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={t('community.pointsInfoTitle')}
        aria-expanded={open}
        className="min-h-11 min-w-11 rounded-full border border-transparent text-gray-400 text-sm font-bold flex items-center justify-center hover:border-gray-300 hover:text-gray-500 active:opacity-50 transition-colors"
      >
        ?
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('community.pointsInfoTitle')}
          className="fixed left-4 right-4 top-16 z-50 mx-auto w-auto max-w-[320px] rounded-2xl border border-gray-100 bg-surface p-4 shadow-lg"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-sm font-semibold text-heading mb-3">{t('community.pointsInfoTitle')}</p>
          <div className="space-y-2">
            {[
              { key: 'srcDaily', label: t('community.srcDaily'), points: t('community.ptsValue', { points: 10 }) },
              { key: 'srcRetro1', label: t('community.srcRetro1'), points: t('community.ptsValue', { points: 7 }) },
              { key: 'srcRetro2', label: t('community.srcRetro2'), points: t('community.ptsValue', { points: 5 }) },
              { key: 'srcRetro3', label: t('community.srcRetro3'), points: t('community.ptsValue', { points: 3 }) },
              { key: 'srcReflection', label: t('community.srcReflection'), points: t('community.ptsValue', { points: 5 }) },
              { key: 'srcBadge', label: t('community.srcBadge'), points: t('community.byBadge') },
            ].map(r => (
              <div key={r.key} className="flex items-start justify-between gap-3">
                <span className="text-xs leading-snug text-gray-500">{r.label}</span>
                <span className="shrink-0 whitespace-nowrap text-xs font-medium text-gray-800">{r.points}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-gray-100 pt-3 text-[10px] leading-snug text-gray-400">
            {t('community.pointsInfoFooter')}
          </p>
        </div>
      )}
    </div>
  )
}
