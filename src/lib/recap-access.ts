import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface RecapAccess {
  /** 看得到回顧的人：admin，或總開關已打開 */
  canUseRecap: boolean
  isAdmin: boolean
}

/**
 * 回顧功能的後台總開關，放在 app_settings 的 recap_enabled。
 *
 * 關閉時一般用戶完全看不到這個功能——簽到後不跳彈窗、個人頁也不會出現
 * 月曆圖示入口，不是「進得去但看到空的」。admin 不受影響，關閉期間還能
 * 自己檢查回顧內容對不對。
 */
export async function getRecapAccess(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<RecapAccess> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: profile }, { data: setting }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).single(),
    sb.from('app_settings').select('value').eq('key', 'recap_enabled').maybeSingle(),
  ])

  const isAdmin = profile?.role === 'admin'

  return {
    isAdmin,
    // 找不到這筆設定就當作開啟——這是既有功能補開關，預設不該讓沒設過
    // 這個 key 的環境（例如漏跑 migration）變成整個功能悄悄消失。
    canUseRecap: isAdmin || setting?.value !== 'false',
  }
}
