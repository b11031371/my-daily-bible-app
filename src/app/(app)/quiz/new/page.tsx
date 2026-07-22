import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import { fetchAvailableDates } from '@/lib/github/api'
import { getQuizAccess } from '@/lib/quiz-access'
import NewQuizForm from '@/components/quiz/NewQuizForm'

export default async function NewQuizPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) redirect('/login')

  // 總開關關著時只有 admin 進得來（社群頁的入口圖示會改成跳「敬請期待」）
  const [{ canUseQuiz, canUseAi }, dates] = await Promise.all([
    getQuizAccess(supabase, user.id),
    fetchAvailableDates(),
  ])
  if (!canUseQuiz) redirect('/community')

  return <NewQuizForm aiAvailable={canUseAi} noteDates={dates.slice(0, 30)} />
}
