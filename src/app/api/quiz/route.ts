import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQuizAccess } from '@/lib/quiz-access'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 擋頁面不夠，直接打 API 一樣要擋
  const { canUseQuiz } = await getQuizAccess(supabase, user.id)
  if (!canUseQuiz) return NextResponse.json({ error: '功能尚未開放', code: 'quiz_closed' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const title = typeof body?.title === 'string' ? body.title.trim() : ''

  const { data: quiz, error } = await supabase
    .from('quizzes')
    .insert({
      owner_id: user.id,
      title: title.slice(0, 60) || '未命名測驗',
      bible_range: typeof body?.bible_range === 'string' ? body.bible_range.trim() || null : null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: '建立失敗' }, { status: 500 })
  return NextResponse.json({ id: quiz.id })
}
