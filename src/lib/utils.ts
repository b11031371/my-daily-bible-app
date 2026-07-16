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

export function getPeriodLabel(type: 'weekly' | 'monthly', date = new Date()): string {
  if (type === 'monthly') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const week = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`
}
