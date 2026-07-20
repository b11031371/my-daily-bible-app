'use client'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LOCALE_COOKIE,
  getDictionary,
  getLocaleMeta,
  translate,
  type Dictionary,
  type Locale,
  type TFunc,
} from '@/lib/i18n'

interface I18nContextValue {
  locale: Locale
  t: TFunc
  setLocale: (locale: Locale) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale
  children: React.ReactNode
}) {
  const router = useRouter()
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  // getDictionary 為純函式，server 與 client 以同一 locale 算出相同結果，
  // 故初次渲染與 SSR 一致，不會 hydration mismatch。
  const dict = useMemo<Dictionary>(() => getDictionary(locale), [locale])
  const t = useCallback<TFunc>((key, params) => translate(dict, key, params), [dict])

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
      document.documentElement.lang = getLocaleMeta(next).htmlLang
      setLocaleState(next) // client component 立即更新
      router.refresh() // server component 重新渲染

      // 另存一份到 profiles.language：cookie 進不了 cron 觸發的 /api/notify，
      // 推播要靠 DB 才知道該送哪種語言。未登入（auth 頁）時略過。
      // 不 await —— 畫面切換不該等網路，失敗也只影響推播語言，下次切換會補上。
      void (async () => {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        if (!data.user) return
        await supabase.from('profiles').update({ language: next }).eq('id', data.user.id)
      })()
    },
    [router],
  )

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
