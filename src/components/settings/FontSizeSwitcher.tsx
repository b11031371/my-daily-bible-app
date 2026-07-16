'use client'
import { useState } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'

const OPTIONS = [
  { size: '14px', descKey: 'settings.fontSmall',    textClass: 'text-xs'  },
  { size: '16px', descKey: 'settings.fontStandard', textClass: 'text-sm'  },
  { size: '18px', descKey: 'settings.fontLarge',    textClass: 'text-base'},
  { size: '20px', descKey: 'settings.fontXL',       textClass: 'text-lg'  },
]

export default function FontSizeSwitcher() {
  const { t } = useI18n()
  const [current, setCurrent] = useState<string>(() => {
    if (typeof window === 'undefined') return '16px'
    return localStorage.getItem('bible-font-size') ?? '16px'
  })

  function apply(size: string) {
    document.documentElement.style.fontSize = size
    try { localStorage.setItem('bible-font-size', size) } catch {}
    setCurrent(size)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#FFF5CC] to-[#FFD880] px-4 py-3">
        <p className="text-base font-bold text-gray-900">{t('settings.fontSize')}</p>
      </div>
      <div className="p-4 flex gap-2">
        {OPTIONS.map(opt => {
          const active = current === opt.size
          return (
            <button
              key={opt.size}
              onClick={() => apply(opt.size)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-colors ${
                active
                  ? 'bg-amber-50 border-amber-400 text-amber-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className={`${opt.textClass} font-bold leading-none`}>A</span>
              <span className="text-[10px]">{t(opt.descKey)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
