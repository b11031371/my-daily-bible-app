'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/components/i18n/I18nProvider'
import TitleDivider from '@/components/layout/TitleDivider'

export default function OpenRoomPrompt({
  quizId, title, questionCount,
}: { quizId: string; title: string; questionCount: number }) {
  const router = useRouter()
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openRoom() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/quiz/${quizId}/rooms`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setLoading(false); setError(data.error ?? t('quiz.saveFail')); return }
    router.refresh()
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/quiz" className="text-gray-400 hover:text-gray-600 active:opacity-50 text-lg">‹</Link>
        <h1 className="page-title font-bold text-heading">{t('quiz.hostTitle')}</h1>
      </div>
      <TitleDivider />

      <div className="bg-surface rounded-2xl p-6 shadow-sm text-center space-y-2">
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-400">{t('quiz.questionCount', { count: questionCount })}</p>

        {error && <p className="text-sm text-danger pt-2">{error}</p>}

        <button
          onClick={openRoom}
          disabled={loading || questionCount === 0}
          className="w-full mt-4 btn-gradient text-gray-900 font-semibold rounded-xl py-3.5 hover:brightness-95 transition-[filter] disabled:opacity-50"
        >
          {loading ? t('quiz.joining') : t('quiz.host')}
        </button>
      </div>
    </div>
  )
}
