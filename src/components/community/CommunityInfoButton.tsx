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
        onClick={() => setOpen(v => !v)}
        className="w-5 h-5 rounded-full border border-gray-300 text-gray-400 text-xs font-bold flex items-center justify-center hover:border-gray-400 hover:text-gray-500 transition-colors"
      >
        ?
      </button>

      {open && (
        <div className="absolute left-0 top-7 z-50 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-700 mb-3">{t('community.pointsInfoTitle')}</p>
          <div className="space-y-2">
            {[
              { key: 'srcDaily', label: t('community.srcDaily'), points: t('community.ptsValue', { points: 10 }) },
              { key: 'srcRetro1', label: t('community.srcRetro1'), points: t('community.ptsValue', { points: 7 }) },
              { key: 'srcRetro2', label: t('community.srcRetro2'), points: t('community.ptsValue', { points: 5 }) },
              { key: 'srcRetro3', label: t('community.srcRetro3'), points: t('community.ptsValue', { points: 3 }) },
              { key: 'srcReflection', label: t('community.srcReflection'), points: t('community.ptsValue', { points: 5 }) },
              { key: 'srcBadge', label: t('community.srcBadge'), points: t('community.byBadge') },
            ].map(r => (
              <div key={r.key} className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{r.label}</span>
                <span className="text-xs font-medium text-gray-800">{r.points}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3 pt-3 border-t border-gray-100">
            {t('community.pointsInfoFooter')}
          </p>
        </div>
      )}
    </div>
  )
}
