import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * 繞過 RLS 的 service role client，只能在 server 端用。
 *
 * 測驗房間那三張表（quiz_rooms / quiz_room_players / quiz_answers）沒有任何
 * RLS policy，因為訪客玩家沒有 auth.uid()。所有房間讀寫都得經過這個 client，
 * 由 API route 自己驗身分（host session 或 player token）並裁切回傳內容。
 */
export function createAdminClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
