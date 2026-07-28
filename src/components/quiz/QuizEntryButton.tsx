'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/components/i18n/I18nProvider'
import { GameController } from '@phosphor-icons/react'

const CLASSES =
  'ml-auto shrink-0 w-10 h-10 rounded-full text-primary-dark flex items-center justify-center hover:bg-primary-light active:scale-90 transition-colors'

/**
 * 社群頁右上角的測驗入口。總開關關著時，一般用戶還是看得到圖示（先讓大家有印象），
 * 但點下去只跳「敬請期待」，不會導頁。
 */
export default function QuizEntryButton({ enabled }: { enabled: boolean }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => setOpen(false), 2200)
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  if (enabled) {
    return (
      <Link href="/quiz" aria-label={t('quiz.title')} title={t('quiz.title')} className={CLASSES}>
        <GameController size={26} weight="fill" />
      </Link>
    )
  }

  return (
    <div ref={ref} className="ml-auto relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={`${t('quiz.title')} · ${t('quiz.comingSoon')}`}
        className={`${CLASSES} ml-0`}
      >
        <GameController size={26} weight="fill" />
      </button>

      {open && (
        <div
          role="status"
          className="absolute right-0 top-11 z-50 whitespace-nowrap rounded-xl border border-gray-100 bg-surface px-3.5 py-2 shadow-lg"
        >
          <p className="text-xs font-medium text-gray-700">{t('quiz.comingSoon')}</p>
        </div>
      )}
    </div>
  )
}
