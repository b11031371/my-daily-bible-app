'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/components/i18n/I18nProvider'
import TitleDivider from '@/components/layout/TitleDivider'
import { QUIZ_CONFIG } from '@/lib/quiz'
import { formatDate } from '@/lib/utils'
import { PencilSimple, Sparkle } from '@phosphor-icons/react'

type Mode = 'manual' | 'ai'
const DIFFICULTIES = ['easy', 'normal', 'hard'] as const

export default function NewQuizForm({ aiAvailable, noteDates }: { aiAvailable: boolean; noteDates: string[] }) {
  const router = useRouter()
  const { t, locale } = useI18n()

  const [mode, setMode] = useState<Mode | null>(null)
  const [title, setTitle] = useState('')
  const [bibleRange, setBibleRange] = useState('')
  const [noteDate, setNoteDate] = useState('')
  const [count, setCount] = useState(5)
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('normal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 兩種模式的終點一樣：建好之後都進編輯器逐題確認
  async function createManual() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setLoading(false); setError(data.error ?? t('quiz.saveFail')); return }
    router.push(`/quiz/${data.id}/edit`)
  }

  async function generateWithAi() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        bible_range: bibleRange,
        note_date: noteDate || null,
        count,
        difficulty,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setLoading(false)
      setError(
        data.code === 'ai_closed' ? t('quiz.aiClosed')
        : data.code === 'daily_limit' ? t('quiz.dailyLimit', { limit: QUIZ_CONFIG.aiDailyLimit })
        : data.error ?? t('quiz.generateFail')
      )
      return
    }
    router.push(`/quiz/${data.id}/edit`)
  }

  const canGenerate = bibleRange.trim().length > 0 || noteDate.length > 0

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center gap-3">
        <Link href="/quiz" className="text-gray-400 hover:text-gray-600 active:opacity-50 text-lg">‹</Link>
        <h1 className="page-title font-bold text-heading">{t('quiz.newTitle')}</h1>
      </div>
      <TitleDivider />

      {mode === null && (
        <div className="space-y-3">
          <button
            onClick={() => setMode('manual')}
            className="w-full bg-surface rounded-2xl p-5 shadow-sm text-left flex items-start gap-4 hover:shadow-md active:scale-[0.99] transition-shadow"
          >
            <span className="shrink-0 w-11 h-11 rounded-xl bg-primary-light text-primary-dark flex items-center justify-center">
              <PencilSimple size={22} weight="bold" />
            </span>
            <span>
              <span className="block font-semibold text-gray-900">{t('quiz.modeManual')}</span>
              <span className="block text-xs text-gray-400 mt-1">{t('quiz.modeManualHint')}</span>
            </span>
          </button>

          <button
            onClick={() => setMode('ai')}
            disabled={!aiAvailable}
            className="w-full bg-surface rounded-2xl p-5 shadow-sm text-left flex items-start gap-4 hover:shadow-md active:scale-[0.99] transition-shadow disabled:opacity-50 disabled:hover:shadow-sm"
          >
            <span className="shrink-0 w-11 h-11 rounded-xl bg-accent-light text-accent flex items-center justify-center">
              <Sparkle size={22} weight="fill" />
            </span>
            <span>
              <span className="block font-semibold text-gray-900">{t('quiz.modeAi')}</span>
              <span className="block text-xs text-gray-400 mt-1">
                {aiAvailable ? t('quiz.modeAiHint') : t('quiz.aiClosed')}
              </span>
            </span>
          </button>
        </div>
      )}

      {mode !== null && (
        <div className="bg-surface rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">{t('quiz.quizTitle')}</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={60}
              placeholder={t('quiz.quizTitlePlaceholder')}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {/* 經文範圍只有 AI 模式需要——那是出題的素材來源。自己出題的人想考什麼
              就考什麼，不該被逼著填一個聖經章節 */}
          {mode === 'ai' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">{t('quiz.bibleRange')}</label>
                <input
                  value={bibleRange}
                  onChange={e => setBibleRange(e.target.value)}
                  maxLength={60}
                  placeholder={t('quiz.bibleRangePlaceholder')}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">{t('quiz.fromNote')}</label>
                <select
                  value={noteDate}
                  onChange={e => setNoteDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">{t('quiz.noneSelected')}</option>
                  {noteDates.map(d => (
                    <option key={d} value={d}>{formatDate(d, locale)}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1.5">{t('quiz.fromNoteHint')}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">{t('quiz.count')}</label>
                <div className="flex gap-1.5 flex-wrap">
                  {[3, 5, 8, 10].map(n => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        count === n ? 'bg-primary text-gray-900' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 active:bg-gray-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">{t('quiz.difficulty')}</label>
                <div className="flex gap-1.5">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        difficulty === d ? 'bg-primary text-gray-900' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 active:bg-gray-200'
                      }`}
                    >
                      {t(`quiz.${d}`)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            onClick={mode === 'ai' ? generateWithAi : createManual}
            disabled={loading || (mode === 'ai' && !canGenerate)}
            className="w-full btn-gradient text-gray-900 font-semibold rounded-xl py-3.5 hover:brightness-95 transition-[filter] disabled:opacity-50"
          >
            {loading
              ? (mode === 'ai' ? t('quiz.generating') : t('quiz.saving'))
              : (mode === 'ai' ? t('quiz.generate') : t('quiz.createQuiz'))}
          </button>

          <button
            onClick={() => { setMode(null); setError(null) }}
            className="w-full text-sm text-gray-400 hover:text-gray-600 active:opacity-50 transition-colors"
          >
            {t('quiz.backToQuiz')}
          </button>
        </div>
      )}
    </div>
  )
}
