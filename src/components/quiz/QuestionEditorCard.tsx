'use client'
import { useI18n } from '@/components/i18n/I18nProvider'
import { ANSWER_STYLES, QUIZ_CONFIG } from '@/lib/quiz'
import AnswerShape from '@/components/quiz/AnswerShape'
import { ArrowUp, ArrowDown, Trash, Check } from '@phosphor-icons/react'
import type { QuizQuestionDraft } from '@/types/app'

interface Props {
  index: number
  total: number
  question: QuizQuestionDraft
  disabled: boolean
  onChange: (patch: Partial<QuizQuestionDraft>) => void
  onMove: (delta: number) => void
  onRemove: () => void
}

export default function QuestionEditorCard({
  index, total, question, disabled, onChange, onMove, onRemove,
}: Props) {
  const { t } = useI18n()

  // 選項固定顯示 4 格；留白的在送出前會被過濾掉，正解跟著往前挪
  const options = [...question.options, '', '', '', ''].slice(0, QUIZ_CONFIG.maxOptions)

  function setOption(i: number, value: string) {
    const next = [...options]
    next[i] = value
    onChange({ options: next })
  }

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{t('quiz.questionN', { n: index + 1 })}</span>
        <div className="flex items-center gap-1 text-gray-300">
          <button
            onClick={() => onMove(-1)}
            disabled={disabled || index === 0}
            aria-label={t('quiz.moveUp')}
            className="p-1.5 hover:text-gray-600 active:opacity-50 transition-colors disabled:opacity-30"
          >
            <ArrowUp size={16} />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={disabled || index === total - 1}
            aria-label={t('quiz.moveDown')}
            className="p-1.5 hover:text-gray-600 active:opacity-50 transition-colors disabled:opacity-30"
          >
            <ArrowDown size={16} />
          </button>
          <button
            onClick={onRemove}
            disabled={disabled || total === 1}
            aria-label={t('quiz.removeQuestion')}
            className="p-1.5 hover:text-danger active:opacity-50 transition-colors disabled:opacity-30"
          >
            <Trash size={16} />
          </button>
        </div>
      </div>

      <textarea
        value={question.prompt}
        onChange={e => onChange({ prompt: e.target.value })}
        disabled={disabled}
        rows={2}
        maxLength={200}
        placeholder={t('quiz.promptPlaceholder')}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
      />

      <div className="space-y-2">
        {options.map((opt, i) => {
          const isCorrect = question.correct_index === i
          return (
            <div key={i} className="flex items-center gap-2">
              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${ANSWER_STYLES[i].bg}`}>
                <AnswerShape shape={ANSWER_STYLES[i].shape} className="w-3.5 h-3.5 text-white" />
              </div>
              <input
                value={opt}
                onChange={e => setOption(i, e.target.value)}
                disabled={disabled}
                maxLength={80}
                placeholder={t('quiz.optionN', { n: i + 1 })}
                className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              />
              <button
                onClick={() => onChange({ correct_index: i })}
                disabled={disabled || !opt.trim()}
                aria-label={t('quiz.markCorrect')}
                aria-pressed={isCorrect}
                className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors disabled:opacity-30 ${
                  isCorrect ? 'bg-success border-success text-white' : 'border-gray-200 text-gray-300 hover:border-success active:scale-90'
                }`}
              >
                <Check size={14} weight="bold" />
              </button>
            </div>
          )
        })}
      </div>

      <input
        value={question.explanation ?? ''}
        onChange={e => onChange({ explanation: e.target.value || null })}
        disabled={disabled}
        maxLength={200}
        placeholder={t('quiz.explanationPlaceholder')}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
      />

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 shrink-0">{t('quiz.timeLimit')}</label>
        <div className="flex gap-1.5 flex-wrap">
          {QUIZ_CONFIG.timeLimitOptions.map(sec => (
            <button
              key={sec}
              onClick={() => onChange({ time_limit_seconds: sec })}
              disabled={disabled}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${
                question.time_limit_seconds === sec
                  ? 'bg-primary text-gray-900'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 active:bg-gray-200'
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
