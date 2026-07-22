import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type AdminClient = SupabaseClient<Database>
export type QuizRoomRow = Database['public']['Tables']['quiz_rooms']['Row']

/**
 * PIN 只在「未結束」的房間之間唯一，結束後可以被回收，所以同一個 PIN 有可能對到
 * 好幾間歷史房間。一律取最新的那間：進行中的房間必然是最新的，而遊戲結束後
 * 大家還停在結算畫面時也還讀得到同一間。
 */
export async function findRoomByPin(admin: AdminClient, pin: string): Promise<QuizRoomRow | null> {
  const { data } = await admin
    .from('quiz_rooms')
    .select('*')
    .eq('pin', pin)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}
