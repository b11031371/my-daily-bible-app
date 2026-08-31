import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLocale } from '@/lib/i18n/server'
import type { Locale } from '@/lib/i18n'
import type { Database } from '@/types/database'
import { MONTH_RE } from '@/lib/recap'
import { getRecapAccess } from '@/lib/recap-access'
import { buildRefreshMeta, type SummaryResponse } from '@/lib/recap-summary'
import { currentMonth, monthRange } from '@/lib/utils'
import { bibleBookOf } from '@/lib/bible-books'
import { extractJson, generateText, type BookSummary } from '@/lib/ai'

type SB = SupabaseClient<Database>

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

/**
 * 真的去產一份摘要：抓內容、分書卷、呼叫 AI、把形狀不對的項目濾掉。
 * 回 null 代表這次沒生成出來（AI 掛了或回了看不懂的東西）。
 *
 * 抽成 helper 是因為三條路都要用：第一次生成、月份結束後的自動補算、
 * 使用者手動重新整理。
 */
async function generate(
  supabase: SB, userId: string, month: string, locale: Locale, mode: string
): Promise<{ summary: BookSummary[]; model: string; elapsedMs: number } | null> {
  const startedAt = Date.now()
  const { dateStart, dateEnd } = monthRange(month)
  const [{ data: reflections }, { data: notes }] = await Promise.all([
    supabase
      .from('reflections')
      .select('note_date, content, bible_range')
      .eq('user_id', userId)
      .gte('note_date', dateStart)
      .lt('note_date', dateEnd)
      .order('note_date', { ascending: true }),
    supabase
      .from('note_meta')
      .select('date, bible_range')
      .gte('date', dateStart)
      .lt('date', dateEnd),
  ])
  if (!reflections?.length) return null

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
  const elapsedMs = Date.now() - startedAt
  // 每次真的呼叫 AI 都留一行：這是唯一會花錢也會花時間的地方，出問題時
  // （變慢、備援一直接手、某個月一直重產）從 log 就看得出來。
  const log = (outcome: string, model = '-') =>
    console.log(`[recap/summary] ${mode} ${month} ${locale} ${outcome} model=${model} ${elapsedMs}ms`)

  if (!result) { log('no-result'); return null }

  const parsed = extractJson<BookSummary[]>(result.text)
  if (!Array.isArray(parsed) || !parsed.length) { log('unparsable', result.model); return null }

  // 只留形狀對的項目：模型偶爾會多塞欄位或漏掉 summary
  const clean = parsed
    .filter(s => typeof s?.book === 'string' && typeof s?.summary === 'string')
    .map(s => ({ book: s.book, summary: s.summary }))

  // 同一卷書也可能被拆成兩筆（prompt 裡每卷只出現一次，是模型自己分的）。
  // 併回同一筆而不是丟掉後面那筆：兩段都是使用者寫的東西，丟掉等於漏講。
  const merged = new Map<string, string>()
  for (const item of clean) {
    const prev = merged.get(item.book)
    merged.set(item.book, prev ? `${prev} ${item.summary}` : item.summary)
  }
  const summary = [...merged].map(([book, text]) => ({ book, summary: text }))
  if (!summary.length) { log('empty', result.model); return null }

  log(`ok books=${summary.length}`, result.model)
  return { summary, model: result.model, elapsedMs }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const month = typeof body?.month === 'string' ? body.month : ''
  if (!MONTH_RE.test(month)) return NextResponse.json({ error: 'Bad month' }, { status: 400 })
  // 未來的月份沒東西可整理，也不該掉進「當月」那條分支
  if (month > currentMonth()) return NextResponse.json({ error: 'Bad month' }, { status: 400 })
  // 使用者按了重新整理。要不要真的重產由伺服器決定，這裡只是請求。
  const wantsRefresh = body?.refresh === true

  // 後台總開關關掉時連這支 API 都不該動 AI——知道網址的人不能繞過入口花錢。
  const { canUseRecap, isAdmin } = await getRecapAccess(supabase, user.id)
  if (!canUseRecap) return NextResponse.json<SummaryResponse>({ summary: [] })

  const locale = await getLocale()
  const key = { user_id: user.id, month, locale }

  const { data: row, error: rowError } = await supabase
    .from('recap_summaries')
    .select('summary, refresh_count, source_count, source_updated_at')
    .match(key)
    .maybeSingle()
  // 讀不到快取就會走成「每次打開都重產」，而且完全沒有徵兆。最可能的原因是
  // migration 024 還沒套用（那四個欄位不存在），所以這裡要吵一聲。
  if (rowError) console.error('[recap/summary] cache read failed:', rowError.message)

  // 指紋只抓 updated_at：一個月最多 31 列（留言一人一天一列），內容等到真的要
  // 生成時再撈，不必為了「回快取」把整個月的文字拉出來。
  const { dateStart, dateEnd } = monthRange(month)
  const { data: stamps } = await supabase
    .from('reflections')
    .select('updated_at')
    .eq('user_id', user.id)
    .gte('note_date', dateStart)
    .lt('note_date', dateEnd)

  const count = stamps?.length ?? 0
  // TIMESTAMPTZ 經過 JS 來回一趟字串格式不保證一模一樣，一律換算成毫秒再比。
  const latest = count ? Math.max(...stamps!.map(s => Date.parse(s.updated_at))) : 0
  const latestIso = new Date(latest).toISOString()
  const ended = month < currentMonth()
  const admin = createAdminClient()

  // ── 1. 還沒有快取：第一次生成，不扣次數 ──────────────────────────
  if (!row) {
    // 沒寫過反思就沒東西可總結。不寫快取——下個月可能就有了。
    if (!count) return NextResponse.json<SummaryResponse>({ summary: [] })

    const result = await generate(supabase, user.id, month, locale, 'first')
    // AI 掛了也不寫快取，下次重開回顧還有機會產出來
    if (!result) return NextResponse.json<SummaryResponse>({ summary: [], failed: true })

    const { error: writeError } = await admin.from('recap_summaries').upsert({
      ...key,
      summary: result.summary,
      model: result.model,
      source_count: count,
      source_updated_at: latestIso,
      updated_at: new Date().toISOString(),
    })
    // 寫不進去就等於沒有快取，下次打開又要重產一次（還是靜悄悄的）
    if (writeError) console.error('[recap/summary] cache write failed:', writeError.message)

    return NextResponse.json<SummaryResponse>({
      summary: result.summary,
      refresh: buildRefreshMeta(count, 0, isAdmin),
      elapsedMs: result.elapsedMs,
      isAdmin,
    })
  }

  // 則數 + 最後更新時間就足夠：新增兩者都變、編輯時間變、刪除則數變。
  // 舊資料（source_count = 0、source_updated_at = NULL）一律算成對不上，
  // 剛好會被下面的自動補算修好。
  const cachedAt = row.source_updated_at ? Date.parse(row.source_updated_at) : 0
  const stale = count !== row.source_count || latest !== cachedAt

  // ── 2. 月份已經結束：內容對不上就免費補算成完整版 ──────────────────
  //
  // 用指紋而不是一次性的「補算過了」旗標：補簽到可以回補 3 天，月初補寫的
  // 上個月留言照樣會被接住。補完指紋就一致，之後打開都直接命中快取。
  // 這條規則不能套用在當月——天天寫、天天開就會變成天天免費重產，那正是
  // 次數存在的理由。
  let autoFailed = false
  if (ended && stale && count) {
    const result = await generate(supabase, user.id, month, locale, 'auto')
    // 補算失敗就先給舊的看：畫面上有內容，不需要顯示 failed，下次打開再試。
    if (result) {
      await admin.from('recap_summaries').update({
        summary: result.summary,
        model: result.model,
        source_count: count,
        source_updated_at: latestIso,
        updated_at: new Date().toISOString(),
      }).match(key)

      return NextResponse.json<SummaryResponse>({
        summary: result.summary,
        refresh: buildRefreshMeta(count, row.refresh_count, isAdmin),
        elapsedMs: result.elapsedMs,
        isAdmin,
      })
    }
    autoFailed = true
  }

  // ── 3. 手動重新整理 ───────────────────────────────────────────
  const meta = buildRefreshMeta(count, row.refresh_count, isAdmin)

  // 次數全部在這裡把關：即使有人自己捏一個 { refresh: true } 打進來，
  // remaining 也是從資料庫現算的，繞不過去。admin 例外——要能反覆檢查
  // 摘要品質對不對，次數不該擋在中間。
  // autoFailed 是同一個請求裡剛剛才失敗過：免費那次都產不出來，這時候扣
  // 使用者一次去撞同一道牆沒有意義。
  if (!wantsRefresh || (!isAdmin && meta.remaining === 0) || autoFailed) {
    return NextResponse.json<SummaryResponse>({ summary: row.summary, refresh: meta, isAdmin })
  }

  // 先扣次數再呼叫 AI。條件更新（WHERE refresh_count = 剛剛讀到的值）就是樂觀鎖：
  // 兩個請求同時進來只有一個扣得到，另一個拿回 0 列，乖乖回快取。
  // admin 完全不走這段：不扣也不需要鎖，反正沒有上限可搶。
  if (!isAdmin) {
    const { data: claimed } = await admin
      .from('recap_summaries')
      .update({ refresh_count: row.refresh_count + 1 })
      .match(key)
      .eq('refresh_count', row.refresh_count)
      .select('refresh_count')
    if (!claimed?.length) {
      return NextResponse.json<SummaryResponse>({ summary: row.summary, refresh: meta, isAdmin })
    }
  }

  const spent = isAdmin ? meta : { ...meta, remaining: meta.remaining - 1 }
  const result = await generate(supabase, user.id, month, locale, isAdmin ? 'admin' : 'refresh')
  // 失敗了次數也不退：退款會讓上限失效，而那次呼叫的錢已經花掉了。
  // generateText 內部已經有指數退避重試加 OpenAI → Gemini 備援，回 null
  // 代表兩家都掛了。
  if (!result) {
    return NextResponse.json<SummaryResponse>({
      summary: row.summary, refresh: spent, refreshFailed: true, isAdmin,
    })
  }

  // 注意這裡不能帶 refresh_count——剛剛那次遞增會被蓋掉。
  await admin.from('recap_summaries').update({
    summary: result.summary,
    model: result.model,
    source_count: count,
    source_updated_at: latestIso,
    updated_at: new Date().toISOString(),
  }).match(key)

  return NextResponse.json<SummaryResponse>({
    summary: result.summary, refresh: spent, elapsedMs: result.elapsedMs, isAdmin,
  })
}
