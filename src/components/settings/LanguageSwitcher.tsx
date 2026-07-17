'use client'
import { Check } from '@phosphor-icons/react'
import { LOCALES } from '@/lib/i18n'
import { useI18n } from '@/components/i18n/I18nProvider'

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
      <div className="section-band px-4 py-3">
        <p className="text-base font-bold text-gray-900">{t('settings.language')}</p>
      </div>
      <div className="p-2 divide-y divide-gray-50">
        {LOCALES.map((l) => {
          const active = locale === l.code
          return (
            <button
              key={l.code}
              onClick={() => setLocale(l.code)}
              className="w-full flex items-center justify-between px-2 py-3 text-left"
            >
              <span className={`text-sm ${active ? 'font-semibold text-primary-dark' : 'text-gray-700'}`}>
                {l.label}
              </span>
              {active && <Check size={18} weight="bold" className="text-primary-dark" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
