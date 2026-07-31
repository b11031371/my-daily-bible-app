import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { monthRange, toTaipeiDate } from '@/lib/utils'
import { bibleBookOf, chaptersOf } from '@/lib/bible-books'
import { buildRecapGroups, type RecapGroup } from '@/lib/recap-groups'

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

// 作息時段。night 跨午夜，判斷時要分成兩段比。順序即優先序：同票時取較早的時段，
// 因為「早起」比「熬夜」更值得當稱號。
export const RHYTHM_BUCKETS = [
  { key: 'dawn', from: 5, to: 8 },
  { key: 'morning', from: 8, to: 12 },
  { key: 'afternoon', from: 12, to: 18 },
  { key: 'evening', from: 18, to: 22 },
  { key: 'night', from: 22, to: 5 },
] as const

// 'none' 是完全沒有簽到紀錄的月份——這種月份仍要顯示這一段，只是稱號不一樣。
export type RhythmBucket = (typeof RHYTHM_BUCKETS)[number]['key'] | 'none'

export interface RecapDay {
  date: string
  day: number
  isRetro: boolean
  hasReflection: boolean
  bibleRange: string | null
}

export interface RecapBadge {
  id: string
  nameZh: string
  nameI18n: Record<string, string> | null
  earnedDate: string
}

export interface RecapRhythm {
  bucket: RhythmBucket
  hourFrom: number
  hourTo: number
}

export interface MonthRecap {
  month: string
  /** 手冊裡直接稱呼使用者用，抓不到就空字串（文案自己處理沒有名字的情況） */
  displayName: string
  daysInMonth: number
  firstWeekday: number
  days: RecapDay[]
  checkinDays: number
  retroDays: number
  reflectionCount: number
  /** 這個月讀過的書卷與各自的天數，依當月第一次讀到的先後排序 */
  books: { book: string; days: number }[]
  badges: RecapBadge[]
  rhythm: RecapRhythm
  chapterCount: number
  /** 當月參與種樹的群組，沒有就是空陣列（那一頁不放進手冊） */
  groups: RecapGroup[]
}

type SB = SupabaseClient<Database>

// TIMESTAMPTZ → 台北時間的小時。sv-SE 給的是 'YYYY-MM-DD HH:MM:SS'，切字串比
// Intl 的 hour/hour12 選項穩（那組在部分 ICU 版本會把午夜回成 24）。
function taipeiHour(iso: string): number {
  return Number(new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' }).slice(11, 13))
}

function bucketOf(hour: number): RhythmBucket {
  for (const b of RHYTHM_BUCKETS) {
    const hit = b.from < b.to ? hour >= b.from && hour < b.to : hour >= b.from || hour < b.to
    if (hit) return b.key
  }
  return 'night'
}

/**
 * 某位使用者某個月的回顧資料。
 *
 * 彈窗的 API route 和 /recap/[month] 頁面都直接呼叫這支，查詢邏輯只有一份。
 * 全部走資料庫——經文範圍讀的是 note_meta 快取，不會為了一行字去抓 GitHub。
 */
export async function buildRecap(supabase: SB, userId: string, month: string): Promise<MonthRecap> {
  const { dateStart, dateEnd, tsStart, tsEnd } = monthRange(month)
  const [y, m] = month.split('-').map(Number)

  const [
    { data: checkins },
    { data: reflections },
    { data: userBadges },
    { data: notes },
    { data: profile },
    groups,
  ] = await Promise.all([
    supabase
      .from('checkins')
      .select('note_date, is_retro, checked_in_at')
      .eq('user_id', userId)
      .gte('note_date', dateStart)
      .lt('note_date', dateEnd)
      .order('note_date', { ascending: true }),
    // 不加 points_earned > 0：既有頁面那樣寫是因為在加總積分，編輯過的反思是 0 分。
    // 這裡要的是「寫了幾則」，編輯過的一樣算數。
    supabase
      .from('reflections')
      .select('note_date')
      .eq('user_id', userId)
      .gte('note_date', dateStart)
      .lt('note_date', dateEnd),
    // earned_at 是 TIMESTAMPTZ，邊界一定要用帶 +08:00 的版本。見 monthRange 的註解。
    supabase
      .from('user_badges')
      .select('badge_id, earned_at, badges(name_zh, name_i18n)')
      .eq('user_id', userId)
      .gte('earned_at', tsStart)
      .lt('earned_at', tsEnd)
      .order('earned_at', { ascending: true }),
    supabase
      .from('note_meta')
      .select('date, bible_range')
      .gte('date', dateStart)
      .lt('date', dateEnd),
    supabase.from('profiles').select('display_name').eq('id', userId).single(),
    buildRecapGroups(supabase, userId, month),
  ])

  const reflectionDates = new Set((reflections ?? []).map(r => r.note_date))
  const rangeByDate = new Map((notes ?? []).map(n => [n.date, n.bible_range]))

  const days: RecapDay[] = (checkins ?? []).map(c => ({
    date: c.note_date,
    day: Number(c.note_date.slice(8, 10)),
    isRetro: c.is_retro,
    hasReflection: reflectionDates.has(c.note_date),
    bibleRange: rangeByDate.get(c.note_date) ?? null,
  }))

  // 書卷天數和章數都從同一輪走訪算出來。章要跨日去重：同一章可能分兩天讀完，
  // 直接加總會重複計。Map 保留插入順序，所以書卷自然是依第一次讀到的先後排列。
  const daysPerBook = new Map<string, number>()
  const chapters = new Set<string>()
  for (const d of days) {
    for (const ch of chaptersOf(d.bibleRange)) chapters.add(ch)
    const book = bibleBookOf(d.bibleRange)
    if (!book) continue
    daysPerBook.set(book, (daysPerBook.get(book) ?? 0) + 1)
  }
  const books = [...daysPerBook.entries()].map(([book, days]) => ({ book, days }))

  const badges: RecapBadge[] = (userBadges ?? []).map(ub => ({
    id: ub.badge_id,
    nameZh: ub.badges?.name_zh ?? ub.badge_id,
    nameI18n: ub.badges?.name_i18n ?? null,
    earnedDate: toTaipeiDate(ub.earned_at),
  }))

  return {
    month,
    displayName: profile?.display_name ?? '',
    // Date.UTC(y, m, 0) = 「下個月的第 0 天」= 這個月最後一天
    daysInMonth: new Date(Date.UTC(y, m, 0)).getUTCDate(),
    firstWeekday: new Date(Date.UTC(y, m - 1, 1)).getUTCDay(),
    days,
    checkinDays: days.length,
    retroDays: days.filter(d => d.isRetro).length,
    reflectionCount: reflections?.length ?? 0,
    books,
    badges,
    rhythm: buildRhythm(checkins ?? []),
    chapterCount: chapters.size,
    groups,
  }
}

/**
 * 讀經作息人格。
 *
 * 用的是 checked_in_at（按下按鈕的當下），不是 note_date。補簽時兩者會差好幾天，
 * 而這張卡問的是「你都幾點打開 app」，所以按鈕時間才是對的。
 *
 * 統計頁四段一律都顯示，不再因為樣本少就整段藏起來——沒有簽到紀錄本身也是一種
 * 「這個月的樣子」，值得被說出來，稱號是「忘記簽到型讀經人」。
 */
function buildRhythm(checkins: { checked_in_at: string }[]): RecapRhythm {
  if (checkins.length === 0) return { bucket: 'none', hourFrom: 0, hourTo: 0 }

  const tally = new Map<RhythmBucket, number>()
  for (const c of checkins) {
    const bucket = bucketOf(taipeiHour(c.checked_in_at))
    tally.set(bucket, (tally.get(bucket) ?? 0) + 1)
  }

  // RHYTHM_BUCKETS 由早到晚，用嚴格大於保留先出現的，同票就取較早的時段。
  let best: (typeof RHYTHM_BUCKETS)[number] = RHYTHM_BUCKETS[0]
  for (const b of RHYTHM_BUCKETS) {
    if ((tally.get(b.key) ?? 0) > (tally.get(best.key) ?? 0)) best = b
  }

  return { bucket: best.key, hourFrom: best.from, hourTo: best.to }
}
