'use client'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Info, Sparkle } from '@phosphor-icons/react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { useReflectionPrompt } from './useReflectionPrompt'

// 心得框的 AI 下筆建議：狀態（useReflectionHint）和畫面（標題列控制、疊在輸入框上的提示、換一個）。
// ReflectionForm 只負責把這些組進表單。

// 「AI 提示」開關記在這台裝置，關掉之後就不再打 API
const HINTS_KEY = 'reflection-prompt-hints'
// 手機連點兩下的判定間隔
const DOUBLE_TAP_MS = 320

type Hint = ReturnType<typeof useReflectionPrompt>

interface UseReflectionHintOptions {
  date: string
  lang: 'zh' | 'en'
  content: string
  setContent: (value: string) => void
  /** 已送出心得時不顯示提示，也不打 API */
  submitted: boolean
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

export function useReflectionHint({ date, lang, content, setContent, submitted, textareaRef }: UseReflectionHintOptions) {
  // null = 還沒讀到裝置上的設定；讀到之前不打 API，免得關掉提示的人也花一次呼叫
  const [hintsOn, setHintsOn] = useState<boolean | null>(null)
  const hint = useReflectionPrompt(date, lang, hintsOn === true && !submitted)

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

  /** 掛在 textarea 上的事件與屬性 */
  const textareaProps = {
    onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === 'Tab' && !e.shiftKey && canAccept) {
        e.preventDefault()
        acceptHint()
      }
    },
    onTouchStart() {
      tapRef.current.downWhileFocused = document.activeElement === textareaRef.current
    },
    onTouchEnd(e: React.TouchEvent<HTMLTextAreaElement>) {
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
    },
    onDoubleClick() {
      if (canAccept) acceptHint()
    },
    'aria-describedby': canAccept ? 'reflection-hint' : undefined,
  }

  return { hint, hintsOn, toggleHints, typed, typing, showGhost, canAccept, textareaProps }
}

/** 標題列右側：ⓘ 說明卡片＋「提示」開關。 */
export function PromptHeaderControls({ hintsOn, onToggle }: { hintsOn: boolean | null; onToggle: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center">
      <PromptInfoButton />
      <button
        type="button"
        role="switch"
        aria-checked={hintsOn === true}
        aria-label={t('community.promptToggleLabel')}
        onClick={onToggle}
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
  )
}

/**
 * 疊在輸入框上的提示文字。父層要是 grid，讓它和 textarea 疊在同一格（col-start-1 row-start-1），
 * 提示比較長時輸入框才會跟著撐高。
 */
export function PromptGhost({ loading, prompt, typed, typing }: { loading: boolean; prompt: string | null; typed: string; typing: boolean }) {
  const { t } = useI18n()
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none col-start-1 row-start-1 m-px flex flex-col gap-1 px-4 py-3 text-sm leading-6 text-gray-400 whitespace-pre-line"
      >
        <span className="inline-flex items-center gap-1 text-[11px] leading-4 text-heading">
          <Sparkle size={11} weight="fill" />
          {loading ? t('community.promptLoading') : t('community.promptLabel')}
        </span>
        {loading ? (
          <span className="h-10 rounded-lg bg-gray-100 animate-pulse" />
        ) : (
          <span className="grid">
            {/* 先用完整句子撐出高度，打字時輸入框才不會一行一行長高 */}
            <span className="invisible col-start-1 row-start-1">{prompt}</span>
            <span className="col-start-1 row-start-1">
              {typed}
              {typing && <span className="ml-0.5 inline-block h-[1em] w-px translate-y-[2px] bg-heading animate-pulse" />}
            </span>
          </span>
        )}
      </div>
      {/* 給螢幕閱讀器：textarea 的 aria-describedby 指向這裡 */}
      {!loading && prompt && <span id="reflection-hint" className="sr-only">{prompt}</span>}
    </>
  )
}

/** 輸入框下方的「換一個」與剩餘次數。 */
export function PromptSwapRow({ hint }: { hint: Hint }) {
  const { t } = useI18n()
  return (
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
