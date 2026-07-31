import type { Locale } from '@/lib/i18n'

// 和合本（繁中）書卷名 → 英文縮寫。縮寫依 SBL Handbook of Style（2d ed., 2014）
// 官方通用縮寫，避免長書卷名撐版（例：以西結書 25:1-11 → Ezek 25:1-11）。
// 註：詩篇單指某篇用 "Ps"（SBL 的 "Pss" 是指整卷/多篇），本表經文皆為具體引用故用 Ps。
export const BIBLE_BOOKS_ZH_TO_EN: Record<string, string> = {
  創世記: 'Gen', 出埃及記: 'Exod', 利未記: 'Lev', 民數記: 'Num', 申命記: 'Deut',
  約書亞記: 'Josh', 士師記: 'Judg', 路得記: 'Ruth',
  撒母耳記上: '1 Sam', 撒母耳記下: '2 Sam', 列王紀上: '1 Kgs', 列王紀下: '2 Kgs',
  歷代志上: '1 Chr', 歷代志下: '2 Chr', 以斯拉記: 'Ezra', 尼希米記: 'Neh', 以斯帖記: 'Esth',
  約伯記: 'Job', 詩篇: 'Ps', 箴言: 'Prov', 傳道書: 'Eccl', 雅歌: 'Song',
  以賽亞書: 'Isa', 耶利米書: 'Jer', 耶利米哀歌: 'Lam', 以西結書: 'Ezek', 但以理書: 'Dan',
  何西阿書: 'Hos', 約珥書: 'Joel', 阿摩司書: 'Amos', 俄巴底亞書: 'Obad', 約拿書: 'Jonah',
  彌迦書: 'Mic', 那鴻書: 'Nah', 哈巴谷書: 'Hab', 西番雅書: 'Zeph', 哈該書: 'Hag',
  撒迦利亞書: 'Zech', 瑪拉基書: 'Mal',
  馬太福音: 'Matt', 馬可福音: 'Mark', 路加福音: 'Luke', 約翰福音: 'John', 使徒行傳: 'Acts',
  羅馬書: 'Rom', 哥林多前書: '1 Cor', 哥林多後書: '2 Cor', 加拉太書: 'Gal',
  以弗所書: 'Eph', 腓立比書: 'Phil', 歌羅西書: 'Col',
  帖撒羅尼迦前書: '1 Thess', 帖撒羅尼迦後書: '2 Thess',
  提摩太前書: '1 Tim', 提摩太後書: '2 Tim', 提多書: 'Titus', 腓利門書: 'Phlm',
  希伯來書: 'Heb', 雅各書: 'Jas', 彼得前書: '1 Pet', 彼得後書: '2 Pet',
  約翰一書: '1 John', 約翰二書: '2 John', 約翰三書: '3 John', 猶大書: 'Jude', 啟示錄: 'Rev',
}

// 把「書卷名 + 章節」切成兩段（例：馬可福音 4:1-20 → 馬可福音 / 4:1-20）。
// 書卷名一律不含數字，所以用第一個數字當分界。
const BOOK_AND_REST = /^(\D+?)\s*(\d.*)$/

// 把存成中文的經文範圍轉成目前語言顯示。zh 原樣回傳；en 則把開頭的中文書卷名
// 換成英文縮寫（章節數字保留），並移除「篇／章／節」等中文標記。未知書卷維持原字串。
export function localizeBibleRange(range: string | null | undefined, locale: Locale): string {
  if (!range) return ''
  if (locale === 'zh') return range
  const m = range.match(BOOK_AND_REST)
  if (!m) return range
  const book = BIBLE_BOOKS_ZH_TO_EN[m[1].trim()]
  if (!book) return range
  const rest = m[2].replace(/[篇章節]/g, '').replace(/\s+/g, ' ').trim()
  return `${book} ${rest}`
}

// 從範圍取出書卷名，一律回中文原名（DB 存的就是中文）。要顯示時再交給
// localizeBibleBook 轉語言——兩件事分開，資料層才不必知道當下是什麼語言。
// 認不出來（沒有章節數字）回 null，呼叫端直接略過。
export function bibleBookOf(range: string | null | undefined): string | null {
  if (!range) return null
  const m = range.match(BOOK_AND_REST)
  return m ? m[1].trim() : null
}

// 單獨一個書卷名的翻譯。localizeBibleRange 靠「書卷名 + 章節」的形態比對，
// 遇到沒有章節的裸書卷名會原樣回傳，所以書卷清單要用這支。
export function localizeBibleBook(zhBook: string, locale: Locale): string {
  if (locale === 'zh') return zhBook
  return BIBLE_BOOKS_ZH_TO_EN[zhBook] ?? zhBook
}

// 筆記裡的範圍實際用過三種分隔符：半形 -、en dash –、全形波浪 ～（順手也收
// em dash 和半形波浪）。先正規化成 -，後面的形態比對才只要寫一種。
const DASHES = /[–—～~−‐]/g

// 一段範圍涵蓋的章，依序試四種寫法。順序有意義：帶節的形態要先比，否則
// 「4:1-20」會被 a-b 那條誤讀成第 1 到 20 章。
const CHAPTER_FORMS: [RegExp, (m: RegExpMatchArray) => [number, number]][] = [
  [/^(\d+):\d+\s*-\s*(\d+):\d+$/, m => [+m[1], +m[2]]],  // 4:1-5:20 跨章帶節
  [/^(\d+):\d+(\s*-\s*\d+)?$/,    m => [+m[1], +m[1]]],  // 4:1-20 / 4:5 單章
  [/^(\d+)\s*-\s*(\d+)$/,         m => [+m[1], +m[2]]],  // 4-6 跨章
  [/^(\d+)$/,                     m => [+m[1], +m[1]]],  // 8 單章
]

/**
 * 一段範圍涵蓋哪幾章，回傳「書卷 章」的識別字串（例：['馬可福音 4', '馬可福音 5']）。
 *
 * 回識別字串而不是數量，是因為同一章可能分兩天讀完（4:1-20、4:21-41），
 * 直接加總會重複計。呼叫端把整個月的結果丟進 Set 去重再數才準。
 *
 * 認不出來的寫法回空陣列——寧可少算，也不要把「4:1-20」讀成 20 章這種亂數。
 */
export function chaptersOf(range: string | null | undefined): string[] {
  if (!range) return []
  const m = range.match(BOOK_AND_REST)
  if (!m) return []
  const book = m[1].trim()
  const rest = m[2].replace(/[篇章節]/g, '').replace(DASHES, '-').replace(/\s+/g, '').trim()

  for (const [re, pick] of CHAPTER_FORMS) {
    const hit = rest.match(re)
    if (!hit) continue
    const [from, to] = pick(hit)
    // 倒著寫或跨度誇張（多半是解析錯了）就放棄，不要生出上百個假章。
    if (to < from || to - from > 150) return []
    return Array.from({ length: to - from + 1 }, (_, i) => `${book} ${from + i}`)
  }
  return []
}
