'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChatCircle, Info, Sparkle } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { useBadgeToast } from '@/components/layout/BadgeToast'
import { useI18n } from '@/components/i18n/I18nProvider'
import { useReflectionPrompt } from './useReflectionPrompt'

// 「AI 提示」開關記在這台裝置，關掉之後就不再打 API
const HINTS_KEY = 'reflection-prompt-hints'
// 手機連點兩下的判定間隔
const DOUBLE_TAP_MS = 320

export default function ReflectionForm({ date, bibleRange, lang }: { date: string; bibleRange: string | null; lang: 'zh' | 'en' }) {
  const router = useRouter()
  const { t } = useI18n()
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [error, setError] = useState('')
  const { showBadges } = useBadgeToast()
  const MAX = 1000

  // null = 還沒讀到裝置上的設定；讀到之前不打 API，免得關掉提示的人也花一次呼叫
  const [hintsOn, setHintsOn] = useState<boolean | null>(null)
  const hint = useReflectionPrompt(date, lang, hintsOn === true && !submitted)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    try {
      setHintsOn(localStorage.getItem(HINTS_KEY) !== 'off')
    } catch {
      setHintsOn(true)
    }
  }, [])

  function toggleHints() {
    const next = !hintsOn
    setHintsOn(next)
    try {
      localStorage.setItem(HINTS_KEY, next ? 'on' : 'off')
    } catch {}
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('reflections')
        .select('content, is_anonymous')
        .eq('user_id', user.id)
        .eq('note_date', date)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setContent(data.content)
            setIsAnonymous(data.is_anonymous)
            setSubmitted(true)
          }
        })
    })
  }, [date])

  // ── 提示句：打字效果 ───────────────────────────────────────────
  const [typed, setTyped] = useState('')
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    const text = hint.prompt ?? ''
    if (!text || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(text)
      setTyping(false)
      return
    }
    let i = 0
    setTyped('')
    setTyping(true)
    const timer = setInterval(() => {
      i += 1
      setTyped(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(timer)
        setTyping(false)
      }
    }, 22)
    return () => clearInterval(timer)
  }, [hint.prompt])

  const showGhost = hintsOn === true && content.length === 0 && (hint.loading || !!hint.prompt)
  const canAccept = showGhost && !hint.loading && !!hint.prompt

  // ── 帶入提示：電腦按 Tab；手機先點進輸入框，再連點兩下 ──────────
  function acceptHint() {
    if (!hint.prompt) return
    // 建議句以「…」結尾、留白讓人接著寫；帶入後去掉，游標停在最後
    const text = hint.prompt.replace(/(…|\.{3})\s*$/, '')
    setContent(text)
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(text.length, text.length)
    })
  }

  // 點進輸入框的那一下不算：按下時游標已經在框裡，才開始計連點
  const tapRef = useRef({ downWhileFocused: false, last: 0 })
  function handleTouchStart() {
    tapRef.current.downWhileFocused = document.activeElement === textareaRef.current
  }
  function handleTouchEnd(e: React.TouchEvent<HTMLTextAreaElement>) {
    const tap = tapRef.current
    if (!tap.downWhileFocused || !canAccept) {
      tap.last = 0
      return
    }
    const now = Date.now()
    if (now - tap.last < DOUBLE_TAP_MS) {
      e.preventDefault() // 擋掉 iOS 連點時的選取／貼上選單
      tap.last = 0
      acceptHint()
    } else {
      tap.last = now
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/reflection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_date: date, content, is_anonymous: isAnonymous, bible_range: bibleRange }),
    })
    const data = await res.json()
    if (res.ok) {
      setPointsEarned(data.points_earned ?? 0)
      if (data.badges_unlocked?.length) showBadges(data.badges_unlocked)
      setSubmitted(true)
      router.refresh()
      router.push(`/community?scrollTo=${date}`)
    } else {
      // 失敗原本靜默：按鈕彈回、文字還在框裡，看起來像沒送出也像送出了。
      setError(t('community.submitFail'))
    }
    setLoading(false)
  }

  const title = (
    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-heading">
      <ChatCircle size={16} weight="fill" />
      {t('noteView.shareThoughts')}
    </h3>
  )

  if (submitted && !loading) {
    return (
      <div>
        <div className="mb-3">{title}</div>
        {pointsEarned > 0 && (
          <div className="text-xs text-gray-700 font-medium mb-2">{t('community.pointsEarned', { points: pointsEarned })}</div>
        )}
        <div className="bg-primary-light rounded-xl p-4 text-sm text-gray-700 leading-6 whitespace-pre-wrap">
          {content}
        </div>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-2 text-xs text-gray-400 underline"
        >
          {t('community.editAnswer')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative mb-2 flex items-center justify-between gap-2">
        {title}
        <div className="flex items-center">
          <PromptInfoButton />
          <button
            type="button"
            role="switch"
            aria-checked={hintsOn === true}
            aria-label={t('community.promptToggleLabel')}
            onClick={toggleHints}
            className="inline-flex min-h-11 items-center gap-1.5 pl-1 text-xs text-gray-500"
          >
            <Sparkle size={14} weight="fill" aria-hidden="true" className={hintsOn ? 'text-heading' : 'text-gray-400'} />
            {t('community.promptToggle')}
            <span
              aria-hidden="true"
              className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${hintsOn ? 'bg-primary-dark' : 'bg-gray-200'}`}
            >
              <span className={`h-4 w-4 rounded-full bg-surface shadow transition-transform ${hintsOn ? 'translate-x-4' : ''}`} />
            </span>
          </button>
        </div>
      </div>

      {/* 輸入框和提示疊在同一格：提示比較長時，輸入框會跟著撐高 */}
      <div className="grid">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Tab' && !e.shiftKey && canAccept) {
              e.preventDefault()
              acceptHint()
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={() => { if (canAccept) acceptHint() }}
          maxLength={MAX}
          rows={4}
          placeholder={showGhost ? '' : t('community.thoughtPlaceholder')}
          aria-describedby={canAccept ? 'reflection-hint' : undefined}
          className="col-start-1 row-start-1 w-full touch-manipulation border border-gray-200 rounded-xl px-4 py-3 text-sm leading-6 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        {showGhost && (
          <div
            aria-hidden="true"
            className="pointer-events-none col-start-1 row-start-1 m-px flex flex-col gap-1 px-4 py-3 text-sm leading-6 text-gray-400 whitespace-pre-line"
          >
            <span className="inline-flex items-center gap-1 text-[11px] leading-4 text-heading">
              <Sparkle size={11} weight="fill" />
              {hint.loading ? t('community.promptLoading') : t('community.promptLabel')}
            </span>
            {hint.loading ? (
              <span className="h-10 rounded-lg bg-gray-100 animate-pulse" />
            ) : (
              <span className="grid">
                {/* 先用完整句子撐出高度，打字時輸入框才不會一行一行長高 */}
                <span className="invisible col-start-1 row-start-1">{hint.prompt}</span>
                <span className="col-start-1 row-start-1">
                  {typed}
                  {typing && <span className="ml-0.5 inline-block h-[1em] w-px translate-y-[2px] bg-heading animate-pulse" />}
                </span>
              </span>
            )}
          </div>
        )}
        {canAccept && <span id="reflection-hint" className="sr-only">{hint.prompt}</span>}
      </div>

      {showGhost && (
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={hint.swap}
            disabled={hint.loading || (!hint.unlimited && hint.remaining === 0)}
            aria-label={hint.unlimited ? t('community.promptSwap') : t('community.promptSwapLabel', { count: hint.remaining })}
            className="inline-flex min-h-11 items-center gap-1 text-xs text-gray-500 disabled:opacity-40"
          >
            <Sparkle size={13} weight="fill" aria-hidden="true" className="text-heading" />
            {t('community.promptSwap')}
            {!hint.unlimited && (
              <span aria-hidden="true" className="ml-0.5 inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gray-100 px-1.5 text-[11px] tabular-nums text-gray-500">
                {hint.remaining}
              </span>
            )}
          </button>
          {hint.failed && <span role="status" className="text-xs text-gray-400">{t('community.promptFailed')}</span>}
        </div>
      )}

      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
      <div className="flex items-center justify-between mt-2">
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
          <div
            onClick={() => setIsAnonymous(v => !v)}
            className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${isAnonymous ? 'bg-primary' : 'bg-gray-200'}`}
          >
            <div className={`w-4 h-4 bg-surface rounded-full shadow transition-transform ${isAnonymous ? 'translate-x-4' : ''}`} />
          </div>
          {t('community.postAnonymously')}
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{content.length}/{MAX}</span>
          <button
            type="submit"
            disabled={loading || content.trim().length === 0}
            className="btn-gradient text-gray-900 text-sm px-4 py-1.5 rounded-full font-medium disabled:opacity-40 hover:brightness-95 transition-[filter]"
          >
            {loading ? t('community.submitting') : t('community.submit')}
          </button>
        </div>
      </div>
    </form>
  )
}

/** 開關旁的 ⓘ：點一下跳出 AI 提示的說明卡片，點外面或按 Esc 關掉。 */
function PromptInfoButton() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={t('community.promptInfoTitle')}
        aria-expanded={open}
        className={`grid min-h-11 w-9 place-items-center rounded-xl ${open ? 'text-heading' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <Info size={18} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t('community.promptInfoTitle')}
          className="absolute right-0 top-full z-20 mt-1 w-[min(290px,100%)] rounded-2xl border border-gray-100 bg-surface p-4 text-xs leading-6 text-gray-600 shadow-lg"
        >
          <p className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-gray-900">
            <Sparkle size={14} weight="fill" aria-hidden="true" className="text-heading" />
            {t('community.promptInfoTitle')}
          </p>
          <ul className="list-disc space-y-1 pl-4">
            <li>{t('community.promptInfoAbout')}</li>
            <li><b className="text-gray-900">{t('community.promptInfoUseLabel')}</b>{t('community.promptInfoUse')}</li>
            <li><b className="text-gray-900">{t('community.promptInfoSwapLabel')}</b>{t('community.promptInfoSwap')}</li>
            <li>{t('community.promptInfoOff')}</li>
          </ul>
        </div>
      )}
    </div>
  )
}
