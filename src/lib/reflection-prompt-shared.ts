// 心得框 AI 建議的前後端共用定義。獨立成一個檔案，前端元件 import 時才不會
// 連帶把 reflection-prompt.ts 裡的 crypto 和 AI SDK 打包進瀏覽器。

/** 「換一個」一天可用的次數。跟 025 migration 裡 swap_count 的 CHECK 上限一致。 */
export const PROMPT_SWAP_LIMIT = 5

/** GET / POST /api/reflection/prompt 共用的回應形狀。 */
export interface ReflectionPromptResponse {
  /** null 代表這次沒產生出來（筆記沒有那兩段，或 AI 掛了），前端改顯示一般的 placeholder */
  prompt: string | null
  /** 今天還能按幾次「換一個」 */
  remaining: number
  limit: number
  /** admin 不受次數限制，方便反覆檢查建議品質 */
  unlimited?: boolean
}
