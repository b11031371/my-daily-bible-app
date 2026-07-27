'use client'
import { LOCALES } from '@/lib/i18n'
import { useI18n } from '@/components/i18n/I18nProvider'

// 精簡的分段式語言切換，供登入前的 auth 頁使用。切換寫入 bible-lang cookie
// （與設定頁同一機制），因此登入前選的語言會綁定整個 App 的顯示語系。
export default function LocaleToggle() {
  const { locale, setLocale } = useI18n()

  return (
    <div className="inline-flex items-center rounded-full border border-gray-200 bg-surface/80 p-0.5 shadow-sm backdrop-blur">
      {LOCALES.map((l) => {
        const active = locale === l.code
        return (
          <button
            key={l.code}
            onClick={() => setLocale(l.code)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? 'btn-gradient text-gray-900'
                : 'text-gray-500 hover:text-gray-700 active:opacity-50'
            }`}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}
