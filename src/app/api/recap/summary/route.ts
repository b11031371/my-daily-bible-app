import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLocale } from '@/lib/i18n/server'
import { MONTH_RE } from '@/lib/recap'
import { monthRange } from '@/lib/utils'
import { bibleBookOf } from '@/lib/bible-books'
import { extractJson, generateText, type BookSummary } from '@/lib/ai'

// 單則反思截斷長度，跟 api/ai/search-reflections 一致。
// 反思本來就是短文，超過這個長度多半是離題或重複，送整篇進去只是多花錢。
const MAX_CHARS = 400

const SYSTEM = `你是一個聖經讀經 app 的整理助手，服務對象是青少年。

任務：使用者提供他自己這個月寫下的反思，依聖經書卷分組。請為每一卷書寫一到兩句話的總結。

規則：
- 只根據使用者實際寫下的內容總結，不要替他發揮、不要加入他沒提過的神學觀點。
- 語氣溫暖、口語，像朋友幫他整理，不要像評語或講道。
- 用第二人稱「你」，不要用「使用者」「作者」。
- 每卷 1-2 句，不要條列。
- 某卷內容太少不足以總結時，就寫他當時關注的那一點，不要硬湊。

輸出：純 JSON 陣列，不要加任何說明文字或 markdown 標記。
格式：[{"book":"書卷名（原樣照抄我給的）","summary":"一到兩句總結"}]
順序跟我給的順序一致。`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const month = typeof body?.month === 'string' ? body.month : ''
  if (!MONTH_RE.test(month)) return NextResponse.json({ error: 'Bad month' }, { status: 400 })

  const locale = await getLocale()

  // 絕大多數請求會停在這裡：一人一月一語言只產一次。
  const { data: cached } = await supabase
    .from('recap_summaries')
    .select('summary')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('locale', locale)
    .maybeSingle()
  if (cached) return NextResponse.json({ summary: cached.summary })

  const { dateStart, dateEnd } = monthRange(month)
  const [{ data: reflections }, { data: notes }] = await Promise.all([
    supabase
      .from('reflections')
      .select('note_date, content, bible_range')
      .eq('user_id', user.id)
      .gte('note_date', dateStart)
      .lt('note_date', dateEnd)
      .order('note_date', { ascending: true }),
    supabase
      .from('note_meta')
      .select('date, bible_range')
      .gte('date', dateStart)
      .lt('date', dateEnd),
  ])

  // 沒寫過反思就沒東西可總結。不寫快取——下個月可能就有了。
  if (!reflections?.length) return NextResponse.json({ summary: [] })

  // 書卷優先用 note_meta（那天大家讀的範圍），沒有才退回使用者寫反思時順手存的。
  const rangeByDate = new Map((notes ?? []).map(n => [n.date, n.bible_range]))
  const byBook = new Map<string, string[]>()
  for (const r of reflections) {
    const range = rangeByDate.get(r.note_date) ?? r.bible_range
    const book = bibleBookOf(range) ?? '其他'
    const list = byBook.get(book) ?? []
    list.push(r.content.length > MAX_CHARS ? r.content.slice(0, MAX_CHARS) + '…' : r.content)
    byBook.set(book, list)
  }

  const langName = locale === 'en' ? 'English' : '繁體中文'
  const prompt = [
    `請用${langName}輸出。書卷名維持我給的原樣，不要翻譯。`,
    '',
    ...[...byBook.entries()].map(([book, texts]) =>
      `【${book}】\n${texts.map(t => `- ${t}`).join('\n')}`
    ),
  ].join('\n')

  const result = await generateText(SYSTEM, prompt)
  // AI 掛了也不寫快取，下次重開回顧還有機會產出來
  if (!result) return NextResponse.json({ summary: [], failed: true })

  const parsed = extractJson<BookSummary[]>(result.text)
  if (!Array.isArray(parsed) || !parsed.length) {
    return NextResponse.json({ summary: [], failed: true })
  }

  // 只留形狀對的項目：模型偶爾會多塞欄位或漏掉 summary
  const summary = parsed
    .filter(s => typeof s?.book === 'string' && typeof s?.summary === 'string')
    .map(s => ({ book: s.book, summary: s.summary }))
  if (!summary.length) return NextResponse.json({ summary: [], failed: true })

  // recap_summaries 只有 SELECT policy，寫入一律走繞過 RLS 的 client
  await createAdminClient()
    .from('recap_summaries')
    .upsert({ user_id: user.id, month, locale, summary, model: result.model })

  return NextResponse.json({ summary })
}
