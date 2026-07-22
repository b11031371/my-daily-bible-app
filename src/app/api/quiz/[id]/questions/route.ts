import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseQuestionDrafts } from '@/lib/quiz'
import { getQuizAccess } from '@/lib/quiz-access'

// 整包覆寫題目：先刪光再重插。比逐題 CRUD 好寫，也讓排序調整不用另外處理。
// 回傳的 error 同時帶 code，前端有對應翻譯就用翻譯、沒有就顯示這裡的中文。
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  // 房間開著的時候改題目，會讓正在作答的人對到不同的題，直接擋掉
  const admin = createAdminClient()
  const { data: activeRoom } = await admin
    .from('quiz_rooms')
    .select('id')
    .eq('quiz_id', id)
    .neq('status', 'ended')
    .maybeSingle()
  if (activeRoom) {
    return NextResponse.json({ error: '房間進行中，結束後才能編輯', code: 'room_active' }, { status: 409 })
  }

  const body = await req.json().catch(() => null)
  const parsed = parseQuestionDrafts(body?.questions)
  if (!parsed.ok) {
    const messages: Record<string, string> = {
      no_questions: '至少要有一題',
      too_many_questions: '題目太多了',
      empty_prompt: '有題目沒有填題幹',
      too_few_options: '每題至少要兩個選項',
      too_many_options: '每題最多四個選項',
      invalid_correct_index: '有題目沒有標記正確答案',
      invalid_time_limit: '作答秒數超出範圍',
      invalid_questions: '格式錯誤',
    }
    return NextResponse.json(
      { error: messages[parsed.error] ?? '格式錯誤', code: parsed.error },
      { status: 400 }
    )
  }

  const { error: delError } = await supabase.from('quiz_questions').delete().eq('quiz_id', id)
  if (delError) return NextResponse.json({ error: '儲存失敗' }, { status: 500 })

  const { error: insError } = await supabase.from('quiz_questions').insert(
    parsed.questions.map((q, i) => ({
      quiz_id: id,
      order_index: i,
      prompt: q.prompt,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation,
      time_limit_seconds: q.time_limit_seconds,
    }))
  )
  if (insError) return NextResponse.json({ error: '儲存失敗' }, { status: 500 })

  await supabase.from('quizzes').update({ updated_at: new Date().toISOString() }).eq('id', id)

  return NextResponse.json({ ok: true, count: parsed.questions.length })
}
