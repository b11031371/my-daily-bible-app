import { cookies } from 'next/headers'
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  getDictionary,
  isLocale,
  translate,
  type Locale,
  type TFunc,
} from './index'

// 讀 bible-lang cookie，非法值回預設。用於 Server Component / layout。
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const v = store.get(LOCALE_COOKIE)?.value
  return isLocale(v) ? v : DEFAULT_LOCALE
}

// Server Component 專用：一次拿到 locale 與 t()。
export async function getServerI18n(): Promise<{ locale: Locale; t: TFunc }> {
  const locale = await getLocale()
  const dict = getDictionary(locale)
  const t: TFunc = (key, params) => translate(dict, key, params)
  return { locale, t }
}
