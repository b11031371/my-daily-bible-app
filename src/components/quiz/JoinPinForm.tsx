'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/components/i18n/I18nProvider'
import { QUIZ_CONFIG } from '@/lib/quiz'

// 只把 PIN 帶到 /play/[pin]，房間存不存在交給那頁去問，這裡不先打 API。
export default function JoinPinForm() {
  const router = useRouter()
  const { t } = useI18n()
  const [pin, setPin] = useState('')

  const ready = pin.length === QUIZ_CONFIG.pinLength

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        if (ready) router.push(`/play/${pin}`)
      }}
      className="bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-2"
    >
      {/* 數字要寬字距才好念，但 placeholder 跟著撐開就會爆版，所以只把 placeholder 縮回來 */}
      <input
        inputMode="numeric"
        pattern="\d*"
        value={pin}
        onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, QUIZ_CONFIG.pinLength))}
        placeholder={t('quiz.enterPin')}
        aria-label={t('quiz.enterPin')}
        className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-3 text-lg tracking-[0.3em] text-center font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary placeholder:text-sm placeholder:tracking-normal placeholder:font-normal"
      />
      <button
        type="submit"
        disabled={!ready}
        className="shrink-0 btn-gradient text-gray-900 font-semibold rounded-xl px-5 py-3 text-sm hover:brightness-95 transition-[filter] disabled:opacity-40"
      >
        {t('quiz.joinAGame')}
      </button>
    </form>
  )
}
