'use client'
import { ANSWER_STYLES } from '@/lib/quiz'
import AnswerShape from '@/components/quiz/AnswerShape'
import { Check, X } from '@phosphor-icons/react'

interface Props {
  options: string[]
  /** 已送出的選項；null 表示還沒作答 */
  chosen: number | null
  /** 只有揭曉後才會有值 */
  correctIndex?: number
  disabled: boolean
  onPick: (index: number) => void
}

// 顏色 + 形狀雙重編碼，色盲也分得出來，主持人喊「三角形」時大家也對得上。
export default function AnswerGrid({ options, chosen, correctIndex, disabled, onPick }: Props) {
  const revealed = correctIndex !== undefined

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {options.map((opt, i) => {
        const style = ANSWER_STYLES[i] ?? ANSWER_STYLES[0]
        const isChosen = chosen === i
        const isCorrect = revealed && correctIndex === i
        // 揭曉後把沒中的選項調暗，正解與自己選的那格留著
        const dimmed = revealed && !isCorrect && !isChosen

        return (
          <button
            key={i}
            onClick={() => onPick(i)}
            disabled={disabled}
            aria-pressed={isChosen}
            className={`${style.bg} relative rounded-2xl px-4 py-5 text-left text-white font-semibold flex items-center gap-3 transition-all ${
              dimmed ? 'opacity-30' : ''
            } ${isChosen && !revealed ? 'ring-4 ring-offset-2 ring-gray-900/20 scale-[0.98]' : ''} ${
              !disabled ? 'active:scale-[0.97]' : ''
            }`}
          >
            <AnswerShape shape={style.shape} className="w-5 h-5 shrink-0" />
            <span className="flex-1 min-w-0 break-words">{opt}</span>
            {revealed && (isCorrect || isChosen) && (
              <span className="shrink-0 w-6 h-6 rounded-full bg-white/95 flex items-center justify-center">
                {isCorrect
                  ? <Check size={15} weight="bold" className="text-success" />
                  : <X size={15} weight="bold" className="text-danger" />}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
