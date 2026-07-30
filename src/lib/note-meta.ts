import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAvailableDates, fetchPassageRange } from '@/lib/github/api'

// 抓不到範圍的日子過多久才再試一次。沒有這個間隔，「筆記存在但沒有 **和合本：**
// 那一行」的日子會永遠留在待辦清單裡，後台那顆按鈕就會無限迴圈。
const RETRY_AFTER_MS = 24 * 60 * 60 * 1000

/**
 * 把 GitHub 上有筆記、但 note_meta 還沒抓到經文範圍的日期補齊。
 *
 * 用「比對差集」而不是「指定日期」，是因為 revalidate webhook 的 body 是空的、
 * 不帶日期（見 skill 的 revalidate.py）。副作用是這支函式自帶回填能力：第一次
 * 呼叫會補歷史資料，之後每次上傳新筆記只有 1 天要處理。
 *
 * 每次最多處理 limit 天，因為每一天都要下載一份完整筆記（幾十 KB），
 * Vercel function 有執行時間上限。回傳 remaining 讓呼叫端決定要不要再打一次。
 */
export async function syncNoteMeta(limit = 20): Promise<{ synced: number; remaining: number }> {
  try {
    const dates = await fetchAvailableDates()
    if (!dates.length) return { synced: 0, remaining: 0 }

    // service role：note_meta 只給 authenticated 讀，寫入一律走繞過 RLS 的 client。
    const supabase = createAdminClient()
    const { data: existing } = await supabase.from('note_meta').select('date, bible_range, synced_at')

    const now = Date.now()
    const skip = new Set(
      (existing ?? [])
        .filter(r => r.bible_range !== null || now - new Date(r.synced_at).getTime() < RETRY_AFTER_MS)
        .map(r => r.date)
    )

    // fetchAvailableDates 已由新到舊排序：中途失敗或提早中斷時，
    // 最近的月份（也是回顧最常看的）已經先進表了。
    const pending = dates.filter(d => !skip.has(d))
    if (!pending.length) return { synced: 0, remaining: 0 }

    const batch = pending.slice(0, limit)
    const syncedAt = new Date().toISOString()
    const rows = await Promise.all(
      batch.map(async date => ({
        // 固定讀中文版：表裡存繁中原文，顯示時才用 localizeBibleRange 轉語言。
        // 順便避開 fetchPassageRange 在 'en' 找不到時多打一次的 fallback。
        date,
        bible_range: await fetchPassageRange(date, 'zh'),
        synced_at: syncedAt,
      }))
    )

    const { error } = await supabase.from('note_meta').upsert(rows, { onConflict: 'date' })
    if (error) return { synced: 0, remaining: pending.length }

    return { synced: batch.length, remaining: pending.length - batch.length }
  } catch {
    // 這支函式掛在 revalidate webhook 上，不該讓筆記上傳流程跟著失敗。
    return { synced: 0, remaining: 0 }
  }
}
