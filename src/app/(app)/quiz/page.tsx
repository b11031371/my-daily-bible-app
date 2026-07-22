import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerI18n } from '@/lib/i18n/server'
import { getQuizAccess } from '@/lib/quiz-access'
import TitleDivider from '@/components/layout/TitleDivider'
import JoinPinForm from '@/components/quiz/JoinPinForm'
import QuizCard from '@/components/quiz/QuizCard'
import { Plus } from '@phosphor-icons/react/dist/ssr'
import type { QuizWithCount } from '@/types/app'

export default async function QuizListPage() {
  const [user, supabase, { t }] = await Promise.all([getUser(), createClient(), getServerI18n()])
  if (!user) redirect('/login')

  // 總開關關著時只有 admin 進得來（社群頁的入口圖示會改成跳「敬請期待」）
  const { canUseQuiz } = await getQuizAccess(supabase, user.id)
  if (!canUseQuiz) redirect('/community')

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('*, quiz_questions(count)')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  const rows = (quizzes ?? []) as unknown as (QuizWithCount & { quiz_questions: { count: number }[] })[]

  // quiz_rooms 沒有 RLS policy（訪客玩家沒有 auth.uid()，房間一律走 service role），
  // 所以「哪份測驗正在進行中」要用 admin client 查
  const admin = createAdminClient()
  const { data: activeRooms } = rows.length
    ? await admin
        .from('quiz_rooms')
        .select('quiz_id, pin')
        .in('quiz_id', rows.map(q => q.id))
        .neq('status', 'ended')
    : { data: [] }

  const pinByQuiz = new Map((activeRooms ?? []).map(r => [r.quiz_id, r.pin]))

  const list: QuizWithCount[] = rows.map(q => ({
    ...q,
    question_count: q.quiz_questions?.[0]?.count ?? 0,
    active_pin: pinByQuiz.get(q.id) ?? null,
  }))

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title font-bold text-heading">{t('quiz.title')}</h1>
          <p className="text-xs text-gray-400 mt-1">{t('quiz.subtitle')}</p>
        </div>
        <Link
          href="/quiz/new"
          aria-label={t('quiz.createQuiz')}
          className="shrink-0 w-10 h-10 rounded-full btn-gradient text-gray-900 flex items-center justify-center hover:brightness-95 transition-[filter]"
        >
          <Plus size={20} weight="bold" />
        </Link>
      </div>
      <TitleDivider />

      <JoinPinForm />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">{t('quiz.myQuizzes')}</h2>

        {list.length === 0 ? (
          <div className="bg-surface rounded-2xl p-6 shadow-sm text-center">
            <p className="text-sm text-gray-500">{t('quiz.noQuizzes')}</p>
            <p className="text-xs text-gray-400 mt-1.5">{t('quiz.noQuizzesHint')}</p>
            <Link
              href="/quiz/new"
              className="inline-block mt-4 btn-gradient text-gray-900 font-semibold rounded-xl px-5 py-2.5 text-sm hover:brightness-95 transition-[filter]"
            >
              {t('quiz.createQuiz')}
            </Link>
          </div>
        ) : (
          list.map(quiz => <QuizCard key={quiz.id} quiz={quiz} />)
        )}
      </section>
    </div>
  )
}
