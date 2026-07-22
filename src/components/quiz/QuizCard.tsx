'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/components/i18n/I18nProvider'
import { PencilSimple, Play, Trash } from '@phosphor-icons/react'
import type { QuizWithCount } from '@/types/app'

export default function QuizCard({ quiz }: { quiz: QuizWithCount }) {
  const router = useRouter()
  const { t } = useI18n()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(t('quiz.deleteConfirm'))) return
    setDeleting(true)
    const res = await fetch(`/api/quiz/${quiz.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) router.refresh()
  }

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{quiz.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('quiz.questionCount', { count: quiz.question_count })}
            {quiz.bible_range ? ` · ${quiz.bible_range}` : ''}
            {quiz.origin === 'ai' ? ' · AI' : ''}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          aria-label={t('quiz.removeQuestion')}
          className="shrink-0 text-gray-300 hover:text-danger transition-colors disabled:opacity-40"
        >
          <Trash size={18} />
        </button>
      </div>

      {quiz.active_pin && (
        <p className="text-xs font-medium text-primary-dark">
          {t('quiz.liveNow', { pin: quiz.active_pin })}
        </p>
      )}

      <div className="flex gap-2">
        <Link
          href={`/quiz/${quiz.id}/edit`}
          className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <PencilSimple size={16} />
          {t('quiz.edit')}
        </Link>
        <Link
          href={`/quiz/${quiz.id}/host`}
          className="flex-1 flex items-center justify-center gap-1.5 btn-gradient text-gray-900 rounded-xl py-2.5 text-sm font-semibold hover:brightness-95 transition-[filter]"
        >
          <Play size={16} weight="fill" />
          {t('quiz.host')}
        </Link>
      </div>
    </div>
  )
}
