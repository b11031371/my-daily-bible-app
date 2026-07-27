'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/components/i18n/I18nProvider'
import TitleDivider from '@/components/layout/TitleDivider'
import QuestionEditorCard from '@/components/quiz/QuestionEditorCard'
import { QUIZ_CONFIG, emptyQuestion } from '@/lib/quiz'
import { Plus } from '@phosphor-icons/react'
import type { QuizQuestionDraft } from '@/types/app'

interface Props {
  quizId: string
  initialTitle: string
  initialBibleRange: string
  initialQuestions: QuizQuestionDraft[]
  /** 有值代表房間開著，這時整份表單唯讀 */
  lockedByRoomPin: string | null
}

export default function QuizEditor({
  quizId, initialTitle, initialBibleRange, initialQuestions, lockedByRoomPin,
}: Props) {
  const router = useRouter()
  const { t } = useI18n()

  const [title, setTitle] = useState(initialTitle)
  const [bibleRange, setBibleRange] = useState(initialBibleRange)
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>(
    initialQuestions.length ? initialQuestions : [emptyQuestion()]
  )
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const locked = lockedByRoomPin !== null

  function update(next: QuizQuestionDraft[]) {
    setQuestions(next)
    setDirty(true)
    setMsg(null)
  }

  function patchQuestion(index: number, patch: Partial<QuizQuestionDraft>) {
    update(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  function move(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= questions.length) return
    const next = [...questions]
    ;[next[index], next[target]] = [next[target], next[index]]
    update(next)
  }

  async function save() {
    setSaving(true)
    setMsg(null)

    // 標題與經文範圍跟題目分開存：前者是 quizzes、後者是 quiz_questions
    const metaRes = await fetch(`/api/quiz/${quizId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, bible_range: bibleRange }),
    })
    if (!metaRes.ok) {
      const data = await metaRes.json().catch(() => ({}))
      setSaving(false)
      setMsg({ ok: false, text: data.error ?? t('quiz.saveFail') })
      return
    }

    const res = await fetch(`/api/quiz/${quizId}/questions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setMsg({ ok: false, text: data.code === 'room_active' ? t('quiz.roomActive') : data.error ?? t('quiz.saveFail') })
      return
    }
    setDirty(false)
    setMsg({ ok: true, text: t('quiz.saved') })
    router.refresh()
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center gap-3">
        <Link href="/quiz" className="text-gray-400 hover:text-gray-600 active:opacity-50 text-lg">‹</Link>
        <h1 className="page-title font-bold text-heading">{t('quiz.editTitle')}</h1>
      </div>
      <TitleDivider />

      {locked && (
        <p className="mb-4 text-sm text-danger bg-danger-soft border border-danger-line rounded-xl px-4 py-3">
          {t('quiz.roomActive')}
        </p>
      )}

      <div className="bg-surface rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">{t('quiz.quizTitle')}</label>
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); setDirty(true) }}
            disabled={locked}
            maxLength={60}
            placeholder={t('quiz.quizTitlePlaceholder')}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          />
        </div>
        {/* 編輯器留著這個欄位但標為選填：AI 產的測驗要改得到範圍，
            自己出題的人可以完全不理它 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">{t('quiz.bibleRangeOptional')}</label>
          <input
            value={bibleRange}
            onChange={e => { setBibleRange(e.target.value); setDirty(true) }}
            disabled={locked}
            maxLength={60}
            placeholder={t('quiz.bibleRangePlaceholder')}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {questions.map((q, i) => (
          <QuestionEditorCard
            key={i}
            index={i}
            total={questions.length}
            question={q}
            disabled={locked}
            onChange={patch => patchQuestion(i, patch)}
            onMove={delta => move(i, delta)}
            onRemove={() => update(questions.filter((_, j) => j !== i))}
          />
        ))}
      </div>

      {questions.length < QUIZ_CONFIG.maxQuestions && !locked && (
        <button
          onClick={() => update([...questions, emptyQuestion()])}
          className="mt-4 w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-2xl py-3.5 text-sm font-medium text-gray-500 hover:border-primary hover:text-primary-dark active:opacity-50 transition-colors"
        >
          <Plus size={16} weight="bold" />
          {t('quiz.addQuestion')}
        </button>
      )}

      {msg && (
        <p className={`mt-4 text-sm ${msg.ok ? 'text-success' : 'text-danger'}`}>{msg.text}</p>
      )}

      {/* 儲存鈕吸底：題目一多就不用捲到最下面才存得到 */}
      <div
        className="sticky bottom-0 -mx-4 px-4 pt-4 pb-2 bg-theme-bg/90 backdrop-blur"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
      >
        {dirty && !locked && <p className="text-xs text-gray-400 mb-1.5 text-center">{t('quiz.unsaved')}</p>}
        <button
          onClick={save}
          disabled={saving || locked}
          className="w-full btn-gradient text-gray-900 font-semibold rounded-xl py-3.5 hover:brightness-95 transition-[filter] disabled:opacity-50"
        >
          {saving ? t('quiz.saving') : t('quiz.save')}
        </button>
      </div>
    </div>
  )
}
