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

// 把存成中文的經文範圍轉成目前語言顯示。zh 原樣回傳；en 則把開頭的中文書卷名
// 換成英文縮寫（章節數字保留），並移除「篇／章／節」等中文標記。未知書卷維持原字串。
export function localizeBibleRange(range: string | null | undefined, locale: Locale): string {
  if (!range) return ''
  if (locale === 'zh') return range
  const m = range.match(/^(\D+?)\s*(\d.*)$/)
  if (!m) return range
  const book = BIBLE_BOOKS_ZH_TO_EN[m[1].trim()]
  if (!book) return range
  const rest = m[2].replace(/[篇章節]/g, '').replace(/\s+/g, ' ').trim()
  return `${book} ${rest}`
}
