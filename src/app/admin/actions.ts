'use server'
import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

async function assertAdmin() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) throw new Error('Unauthorized')
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') throw new Error('Unauthorized')
  return { user, supabase }
}

export async function setApprovalMode(enabled: boolean) {
  const { supabase } = await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('app_settings').update({ value: enabled ? 'true' : 'false' }).eq('key', 'approval_mode')
  revalidatePath('/notes')
  revalidatePath('/notes/[date]', 'page')
  revalidatePath('/admin')
}

// 搶答測驗的總開關。關閉時一般用戶在社群頁還是看得到入口圖示，
// 但點下去只跳「敬請期待」；admin 不受影響，可以先備題試玩。
export async function setQuizOpen(enabled: boolean) {
  const { supabase } = await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('app_settings').update({ value: enabled ? 'true' : 'false' }).eq('key', 'quiz_open')
  revalidatePath('/community')
  revalidatePath('/quiz')
  revalidatePath('/admin')
}

// 關閉時只有 admin 用得了 AI 出題（/api/quiz/generate 會再擋一次），
// 打開就等於把 API 成本開放給所有登入用戶，所以預設是關的。
export async function setQuizAiOpen(enabled: boolean) {
  const { supabase } = await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('app_settings').update({ value: enabled ? 'true' : 'false' }).eq('key', 'quiz_ai_open')
  revalidatePath('/quiz/new')
  revalidatePath('/admin')
}

// 每月回顧的總開關（見 lib/recap-access.ts）。關閉時一般用戶簽到不跳彈窗、
// 個人頁也不會出現月曆圖示；admin 不受影響。
export async function setRecapEnabled(enabled: boolean) {
  const { supabase } = await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('app_settings').update({ value: enabled ? 'true' : 'false' }).eq('key', 'recap_enabled')
  revalidatePath('/profile')
  revalidatePath('/recap/[month]', 'page')
  revalidatePath('/admin')
}
