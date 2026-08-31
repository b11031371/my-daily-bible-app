import type { BookSummary } from '@/lib/ai'

/**
 * 回顧摘要的重新整理次數，依那個月寫了幾則留言發放。
 *
 * 寫得越多拿越多：2 則起跳給 2 次，滿 5 則再多 3 次（共 5 次），之後每多一則多一次。
 * 5 則之後次數剛好等於留言數（2 + 3 + (n - 5) = n），所以直接回 count。
 *
 * 留言是一人一天一列（reflections 的 UNIQUE(user_id, note_date)），一個月最多
 * 31 則，次數上限因此也是 31——就是 024 那個 CHECK 的來源，改這裡要一起改。
 *
 * 只有使用者自己按下重新整理才扣次數。系統自動觸發的（第一次生成、月初簽到彈窗、
 * 月份結束後的補算）一律免費。
 */
export const SUMMARY_REFRESH_MIN = 2       // 低階門檻：寫滿 2 則才開始有次數
export const SUMMARY_REFRESH_STEP = 5      // 高階門檻：滿 5 則之後每則 +1
export const SUMMARY_REFRESH_MIN_QUOTA = 2 // 低階給幾次

export function summaryRefreshQuota(count: number): number {
  if (count < SUMMARY_REFRESH_MIN) return 0
  if (count < SUMMARY_REFRESH_STEP) return SUMMARY_REFRESH_MIN_QUOTA
  return count
}

/** 畫面上就是一個 `remaining/total` 的分數，規則本身收在問號卡裡。 */
export interface RefreshMeta {
  /** 這個月一共有幾次（分母） */
  total: number
  /** 還剩幾次（分子） */
  remaining: number
  /** admin 不受次數限制，畫面顯示 ∞ 而不是分數 */
  unlimited?: boolean
}

export function buildRefreshMeta(
  count: number, usedRefreshes: number, isAdmin = false
): RefreshMeta {
  const total = summaryRefreshQuota(count)
  // 留言被刪掉會讓 total 縮水到比已用次數還小，夾在 0 以上，不讓畫面出現負數
  const meta: RefreshMeta = { total, remaining: Math.max(0, total - usedRefreshes) }
  // admin 要能反覆檢查摘要品質，次數不該擋在中間；也不扣，所以不動 remaining
  return isAdmin ? { ...meta, unlimited: true } : meta
}

export interface SummaryResponse {
  summary: BookSummary[]
  /** 第一次就沒生成成功，前端顯示重試按鈕 */
  failed?: boolean
  /** 重新整理沒成功，畫面留著舊摘要，次數已經扣掉 */
  refreshFailed?: boolean
  refresh?: RefreshMeta
  /** 這次請求真的呼叫了 AI 的話，生成花了幾毫秒。只有 admin 的畫面會顯示 */
  elapsedMs?: number
  isAdmin?: boolean
}
