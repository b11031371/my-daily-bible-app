'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/components/i18n/I18nProvider'
import { QUIZ_CONFIG } from '@/lib/quiz'

export default function PlayPinEntry() {
  const router = useRouter()
  const { t } = useI18n()
  const [pin, setPin] = useState('')
  const ready = pin.length === QUIZ_CONFIG.pinLength

  return (
    <div className="min-h-svh flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-heading text-center">{t('quiz.joinTitle')}</h1>

        <form
          onSubmit={e => { e.preventDefault(); if (ready) router.push(`/play/${pin}`) }}
          className="space-y-3"
        >
          <input
            autoFocus
            inputMode="numeric"
            pattern="\d*"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, QUIZ_CONFIG.pinLength))}
            placeholder={t('quiz.enterPin')}
            aria-label={t('quiz.enterPin')}
            className="w-full border border-gray-200 rounded-2xl px-4 py-5 text-2xl tracking-[0.3em] text-center font-bold bg-surface focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-base placeholder:tracking-normal placeholder:font-normal"
          />
          <button
            type="submit"
            disabled={!ready}
            className="w-full btn-gradient text-gray-900 font-semibold rounded-xl py-3.5 hover:brightness-95 transition-[filter] disabled:opacity-40"
          >
            {t('quiz.joinGame')}
          </button>
        </form>
      </div>
    </div>
  )
}
