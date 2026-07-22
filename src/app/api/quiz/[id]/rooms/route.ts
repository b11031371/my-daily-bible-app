import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generatePin } from '@/lib/quiz'
import { getQuizAccess } from '@/lib/quiz-access'

// 開房。同一份測驗同時只會有一間活著的房間，重複按就把現有的 PIN 還回去。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 擋頁面不夠，直接打 API 一樣要擋
  const { canUseQuiz } = await getQuizAccess(supabase, user.id)
  if (!canUseQuiz) return NextResponse.json({ error: '功能尚未開放', code: 'quiz_closed' }, { status: 403 })

  // RLS 的 SELECT policy 也放行 admin 讀別人的測驗，所以擁有權要自己再確認一次
  const { data: quiz } = await supabase
    .from('quizzes').select('id').eq('id', id).eq('owner_id', user.id).maybeSingle()
  if (!quiz) return NextResponse.json({ error: '找不到測驗' }, { status: 404 })

  const admin = createAdminClient()

  const { count } = await admin
    .from('quiz_questions')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', id)
  if (!count) return NextResponse.json({ error: '這份測驗還沒有題目', code: 'no_questions' }, { status: 400 })

  const { data: existing } = await admin
    .from('quiz_rooms')
    .select('pin')
    .eq('quiz_id', id)
    .neq('status', 'ended')
    .maybeSingle()
  if (existing) return NextResponse.json({ pin: existing.pin, reused: true })

  // 產生 → 查重 → 最多重試 5 次（沿用 groups 邀請碼的做法）
  for (let i = 0; i < 5; i++) {
    const pin = generatePin()
    const { data: room, error } = await admin
      .from('quiz_rooms')
      .insert({ quiz_id: id, host_id: user.id, pin })
      .select('pin')
      .single()
    if (!error && room) return NextResponse.json({ pin: room.pin, reused: false })
    // 23505 = unique_violation，撞號就換一個再試
    if ((error as { code?: string } | null)?.code !== '23505') break
  }

  return NextResponse.json({ error: '開房失敗，請再試一次' }, { status: 500 })
}
