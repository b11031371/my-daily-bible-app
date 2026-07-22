import { notFound, redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getQuizAccess } from '@/lib/quiz-access'
import QuizEditor from '@/components/quiz/QuizEditor'
import type { QuizQuestionDraft } from '@/types/app'

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) redirect('/login')

  // 總開關關著時只有 admin 進得來（社群頁的入口圖示會改成跳「敬請期待」）
  const { canUseQuiz } = await getQuizAccess(supabase, user.id)
  if (!canUseQuiz) redirect('/community')

  // 只有擁有者編輯得了自己的測驗（RLS 的 SELECT 另外放行了 admin，這裡收緊）
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, title, bible_range')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!quiz) notFound()

  const [{ data: questions }, { data: activeRoom }] = await Promise.all([
    supabase
      .from('quiz_questions')
      .select('prompt, options, correct_index, explanation, time_limit_seconds')
      .eq('quiz_id', id)
      .order('order_index'),
    createAdminClient()
      .from('quiz_rooms')
      .select('pin')
      .eq('quiz_id', id)
      .neq('status', 'ended')
      .maybeSingle(),
  ])

  return (
    <QuizEditor
      quizId={quiz.id}
      initialTitle={quiz.title}
      initialBibleRange={quiz.bible_range ?? ''}
      initialQuestions={(questions ?? []) as QuizQuestionDraft[]}
      lockedByRoomPin={activeRoom?.pin ?? null}
    />
  )
}
