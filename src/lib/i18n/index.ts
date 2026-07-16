import { en, type Dictionary } from './dictionaries/en'
import { zh } from './dictionaries/zh'
// 註：Tagalog 字典（dictionaries/tl.ts）暫時停用但保留在檔案系統，
// 日後要重新支援只需把它 import 回來、在 LOCALES 與 DICTS 各加一列即可。

export type { Dictionary }

// 單一清單驅動一切：語言、型別、切換器選項、html lang、筆記預設語言都由此衍生。
// 新增語言 = 這裡加一列 + 新增一份字典檔並註冊到 DICTS，其餘自動涵蓋。
export const LOCALES = [
  { code: 'zh', label: '中文', htmlLang: 'zh-Hant', noteLang: 'zh' },
  { code: 'en', label: 'English', htmlLang: 'en', noteLang: 'en' },
] as const

export type Locale = (typeof LOCALES)[number]['code']
export type NoteLang = (typeof LOCALES)[number]['noteLang']

// 無 cookie / 非法值時的預設（含未登入的 auth 頁）
export const DEFAULT_LOCALE: Locale = 'zh'
// 缺字 fallback 的來源語言（en 保證完整）
export const FALLBACK_LOCALE: Locale = 'en'
export const LOCALE_COOKIE = 'bible-lang'

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

const DICTS: Record<Locale, DeepPartial<Dictionary>> = { zh, en }

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && LOCALES.some((l) => l.code === v)
}

export function getLocaleMeta(locale: Locale) {
  return LOCALES.find((l) => l.code === locale) ?? LOCALES[0]
}

export function noteLangFor(locale: Locale): NoteLang {
  return getLocaleMeta(locale).noteLang
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function deepMerge<T>(base: T, override: DeepPartial<T>): T {
  const out = { ...base } as Record<string, unknown>
  for (const key of Object.keys(override ?? {})) {
    const o = (override as Record<string, unknown>)[key]
    const b = (base as Record<string, unknown>)[key]
    out[key] = isObject(b) && isObject(o) ? deepMerge(b, o as DeepPartial<typeof b>) : o ?? b
  }
  return out as T
}

// 回傳完整字典：把該語言的值疊在英文之上，任何缺的 key（例如尚未翻譯的
// Tagalog 字串）自動退回英文，畫面不會出現空白或 key 名。
export function getDictionary(locale: Locale): Dictionary {
  if (locale === FALLBACK_LOCALE) return en
  return deepMerge(en, DICTS[locale] ?? {})
}

// 從 JSONB 多語欄位（如 DB 的 badges.name_i18n = {"zh":"...","en":"..."}）取出
// 對應語言字串；該語言缺值時退回 map['zh']，再退回傳入的 fallback（通常是舊的
// name_zh 欄位）。加語言只需在 JSON 塞 key，不動表結構。
export function localize(map: unknown, locale: Locale, fallback = ''): string {
  if (map && typeof map === 'object') {
    const m = map as Record<string, unknown>
    const v = m[locale] ?? m['zh']
    if (typeof v === 'string' && v) return v
  }
  return fallback
}

export type TFunc = (key: string, params?: Record<string, string | number>) => string

// 以 dot-path（'nav.notes'）查字典，套 {token} 插值，找不到回傳 key 本身。
export function translate(
  dict: Dictionary,
  key: string,
  params?: Record<string, string | number>,
): string {
  const raw = key
    .split('.')
    .reduce<unknown>((acc, part) => (isObject(acc) ? acc[part] : undefined), dict)
  if (typeof raw !== 'string') return key
  if (!params) return raw
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`,
  )
}
