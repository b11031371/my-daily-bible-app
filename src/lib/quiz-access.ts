import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface QuizAccess {
  /** 進得了 /quiz 的人：admin，或總開關已打開 */
  canUseQuiz: boolean
  /** 用得了 AI 出題的人：admin，或 AI 開關已打開 */
  canUseAi: boolean
  isAdmin: boolean
}

/**
 * 搶答測驗的兩道開關，都放在 app_settings：
 * - quiz_open   總開關，關著時一般用戶點入口只會看到「敬請期待」
 * - quiz_ai_open  AI 出題，關著時只有 admin 用得了
 *
 * admin 兩者都不受限，才有辦法在正式開放前先備題、試玩。
 */
export async function getQuizAccess(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<QuizAccess> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).single(),
    sb.from('app_settings').select('key, value').in('key', ['quiz_open', 'quiz_ai_open']),
  ])

  const map = new Map<string, string>(
    ((settings ?? []) as { key: string; value: string }[]).map(s => [s.key, s.value])
  )
  const isAdmin = profile?.role === 'admin'

  return {
    isAdmin,
    canUseQuiz: isAdmin || map.get('quiz_open') === 'true',
    canUseAi: isAdmin || map.get('quiz_ai_open') === 'true',
  }
}
