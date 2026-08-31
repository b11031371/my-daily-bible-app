import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getLocaleMeta, type Locale } from '@/lib/i18n'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateZH(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${year}年${parseInt(month)}月${parseInt(day)}日`
}

// 依 locale 以 Intl 格式化日期（'YYYY-MM-DD' → 例如 zh:2026年7月16日、
// en:July 16, 2026、tl:Hulyo 16, 2026）。新增語言自動取得格式。
export function formatDate(dateStr: string, locale: Locale): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return new Intl.DateTimeFormat(getLocaleMeta(locale).htmlLang, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

// 依 locale 格式化年月（'YYYY-MM-DD' 或 'YYYY-MM' → 例如 zh:2026年7月、
// en:July 2026）。
export function formatMonth(dateStr: string, locale: Locale): string {
  const [y, m] = dateStr.split('-').map(Number)
  const date = new Date(y, (m || 1) - 1, 1)
  return new Intl.DateTimeFormat(getLocaleMeta(locale).htmlLang, {
    year: 'numeric',
    month: 'long',
  }).format(date)
}

export function formatDateShort(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${parseInt(month)}/${parseInt(day)}`
}

export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function todayString(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export function getLastSevenDays(): string[] {
  const [y, m, d] = todayString().split('-').map(Number)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1, d - (6 - i)))
    return toDateString(date)
  })
}

// 'YYYY-MM-DD' 或 'YYYY-MM' → 前一個月的 'YYYY-MM'。月份運算一律走 Date.UTC，
// 伺服器本身的時區才不會滲進來（跟 getLastSevenDays 同一套寫法）。
export function prevMonth(dateOrMonth: string): string {
  const [y, m] = dateOrMonth.split('-').map(Number)
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7)
}

// 'YYYY-MM' → 下一個月的 'YYYY-MM'。
export function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7)
}

// 台北曆的當月 'YYYY-MM'。月份比較全站一律用同格式的字串比大小
// （month < currentMonth() 就是「這個月已經過完了」），不繞 Date。
export function currentMonth(): string {
  return todayString().slice(0, 7)
}

/**
 * 一個月份的查詢邊界，皆為半開區間（結束值用 .lt() 比）。
 *
 * 分成兩組是因為兩種欄位型別的比法不同：DATE 欄位（checkins/reflections.note_date）
 * 沒有時區，直接比日期字串；TIMESTAMPTZ 欄位（user_badges.earned_at）一定要帶
 * +08:00，只寫 '2026-06-01' 會被當成 UTC 午夜，等於台北 6/1 早上 8 點——月初 8 小時
 * 內拿到的徽章會漏掉、上個月最後 8 小時的則被誤算進來。
 */
export function monthRange(month: string) {
  const end = nextMonth(month)
  return {
    dateStart: `${month}-01`,
    dateEnd: `${end}-01`,
    tsStart: `${month}-01T00:00:00+08:00`,
    tsEnd: `${end}-01T00:00:00+08:00`,
  }
}

// TIMESTAMPTZ 的 ISO 字串 → 台北曆日 'YYYY-MM-DD'，跟 todayString() 同一套規則。
export function toTaipeiDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export function getPeriodLabel(type: 'weekly' | 'monthly', date = new Date()): string {
  if (type === 'monthly') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const week = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`
}
