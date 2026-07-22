import { notFound, redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getQuizAccess } from '@/lib/quiz-access'
import HostConsole from '@/components/quiz/HostConsole'
import OpenRoomPrompt from '@/components/quiz/OpenRoomPrompt'

export default async function HostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) redirect('/login')

  // 總開關關著時只有 admin 進得來（社群頁的入口圖示會改成跳「敬請期待」）
  const { canUseQuiz } = await getQuizAccess(supabase, user.id)
  if (!canUseQuiz) redirect('/community')

  // 只有擁有者能主持自己的測驗（RLS 的 SELECT 另外放行了 admin，這裡收緊）
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, title')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!quiz) notFound()

  const admin = createAdminClient()
  const [{ data: room }, { count }] = await Promise.all([
    admin.from('quiz_rooms').select('pin').eq('quiz_id', id).neq('status', 'ended').maybeSingle(),
    admin.from('quiz_questions').select('*', { count: 'exact', head: true }).eq('quiz_id', id),
  ])

  // 開房是有副作用的動作，不在頁面載入時偷偷做，讓主持人自己按
  if (!room) {
    return <OpenRoomPrompt quizId={quiz.id} title={quiz.title} questionCount={count ?? 0} />
  }

  return <HostConsole pin={room.pin} quizId={quiz.id} />
}
