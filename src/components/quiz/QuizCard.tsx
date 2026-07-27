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
  // 原生 confirm() 會用系統樣式蓋住整個畫面，跟 app 的視覺完全斷裂，所以改成
  // 就地把卡片內容換成確認條。代價是流程從「阻塞」變成兩段式：按垃圾桶只開啟
  // 確認狀態，真正的 DELETE 等按下確認才送。
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setDeleting(true)
    setError('')
    const res = await fetch(`/api/quiz/${quiz.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      router.refresh()
      return
    }
    // 原本這裡整個是靜默的：刪不掉時卡片還在，使用者只會以為沒按到而重按。
    setConfirming(false)
    setError(t('quiz.deleteFail'))
  }

  if (confirming) {
    return (
      <>
        {/* 點卡片以外的任何地方 = 取消 */}
        <div className="fixed inset-0 z-40" onClick={() => setConfirming(false)} />
        <div className="relative z-50 bg-surface rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-700 leading-6">{t('quiz.deleteConfirm')}</p>
          {/* 提示獨立成一行、按鈕另起一行靠右：中／英文長度差距大，擠在同一行
              會爆版。 */}
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-40"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="border border-danger-line bg-danger-soft rounded-xl px-4 py-2 text-sm font-semibold text-danger active:scale-95 transition-transform disabled:opacity-40"
            >
              {t('quiz.deleteAction')}
            </button>
          </div>
        </div>
      </>
    )
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
          onClick={() => { setError(''); setConfirming(true) }}
          disabled={deleting}
          aria-label={t('quiz.removeQuestion')}
          className="shrink-0 text-gray-300 hover:text-danger active:scale-90 transition-[color,transform] disabled:opacity-40"
        >
          <Trash size={18} />
        </button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {quiz.active_pin && (
        <p className="text-xs font-medium text-primary-dark">
          {t('quiz.liveNow', { pin: quiz.active_pin })}
        </p>
      )}

      <div className="flex gap-2">
        <Link
          href={`/quiz/${quiz.id}/edit`}
          className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
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
