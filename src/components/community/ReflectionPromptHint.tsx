'use client'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { ArrowClockwise, Info, Sparkle } from '@phosphor-icons/react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { useReflectionPrompt } from './useReflectionPrompt'

// 心得框的 AI 下筆建議：狀態（useReflectionHint）和畫面（標題列的換一個／說明／開關、疊在輸入框上的提示）。
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

interface PromptHeaderControlsProps {
  hint: Hint
  hintsOn: boolean | null
  onToggle: () => void
  /** 提示正顯示在輸入框裡（框是空的）；已經開始打字時換了也看不到，換一個就停用 */
  canSwap: boolean
}

/** 標題列右側：↻ 換一個＋ⓘ 使用說明＋AI 開關。 */
export function PromptHeaderControls({ hint, hintsOn, onToggle, canSwap }: PromptHeaderControlsProps) {
  const { t } = useI18n()
  const swapLabel = hint.unlimited ? t('community.promptSwap') : t('community.promptSwapLabel', { count: hint.remaining })
  return (
    <div className="flex items-center">
      {hintsOn && (
        <button
          type="button"
          onClick={hint.swap}
          disabled={!canSwap || hint.loading || (!hint.unlimited && hint.remaining === 0)}
          aria-label={swapLabel}
          title={swapLabel}
          className="grid min-h-11 w-9 place-items-center rounded-xl text-gray-400 hover:text-gray-600 disabled:opacity-40 disabled:hover:text-gray-400"
        >
          <span className="relative">
            <ArrowClockwise size={17} aria-hidden="true" className={hint.loading ? 'animate-spin' : ''} />
            {/* 剩餘次數：像 iPhone 未讀數字的紅底白字小圓。用完（0）就不顯示，按鈕本身會變灰。
                箭頭尖端佔了圖示右上角一大塊，小圓整個移到圖示右上外側（左緣貼齊圖示右緣），
                再加一圈卡片底色的外框跟圖案隔開 */}
            {!hint.unlimited && hint.remaining > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-2.5 left-4 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF3B30] px-1 text-[10px] font-semibold leading-none text-white tabular-nums ring-2 ring-surface"
              >
                {hint.remaining}
              </span>
            )}
          </span>
        </button>
      )}
      <PromptInfoButton />
      <button
        type="button"
        role="switch"
        aria-checked={hintsOn === true}
        aria-label={t('community.promptToggleLabel')}
        onClick={onToggle}
        className="inline-flex min-h-11 items-center pl-1"
      >
        {/* 開關本身就是標示：圓鈕上寫 AI，不另外放文字 */}
        <span
          aria-hidden="true"
          className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${hintsOn ? 'bg-primary-dark' : 'bg-gray-200'}`}
        >
          <span
            className={`grid h-5 w-5 place-items-center rounded-full bg-surface text-[8px] font-bold leading-none shadow transition-transform ${hintsOn ? 'translate-x-5 text-primary-dark' : 'text-gray-400'}`}
          >
            AI
          </span>
        </span>
      </button>
    </div>
  )
}

/**
 * 疊在輸入框上的提示文字。父層要是 grid，讓它和 textarea 疊在同一格（col-start-1 row-start-1），
 * 提示比較長時輸入框才會跟著撐高。
 */
export function PromptGhost({ loading, failed, prompt, typed, typing }: { loading: boolean; failed: boolean; prompt: string | null; typed: string; typing: boolean }) {
  const { t } = useI18n()
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none col-start-1 row-start-1 m-px flex flex-col gap-1 px-4 py-3 text-sm leading-6 text-gray-400 whitespace-pre-line"
      >
        <span className="inline-flex items-center gap-1 text-[11px] leading-4 text-heading">
          <Sparkle size={11} weight="fill" />
          {/* 換一個失敗時，原本的建議句留著，這行改成提示失敗 */}
          {loading ? t('community.promptLoading') : failed ? t('community.promptFailed') : t('community.promptLabel')}
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
      {/* 上面那層是 aria-hidden，失敗訊息另外給螢幕閱讀器唸 */}
      {failed && <span role="status" className="sr-only">{t('community.promptFailed')}</span>}
    </>
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
          <p className="mb-1.5 font-semibold text-gray-800">{t('community.promptInfoAbout')}</p>
          <ul className="list-disc space-y-1 pl-4">
            <li><b className="text-gray-900">{t('community.promptInfoUseLabel')}</b>{t('community.promptInfoUse')}</li>
            <li>
              <b className="text-gray-900">{t('community.promptInfoSwapLabel')}</b>
              {/* 文案裡的 {icon} 換成跟標題列同一個重新整理圖示，兩邊才對得起來 */}
              {t('community.promptInfoSwap').split('{icon}').map((part, i) => (
                <span key={i}>
                  {i > 0 && <ArrowClockwise size={13} aria-label="↻" className="mx-0.5 inline-block -translate-y-px align-middle text-gray-500" />}
                  {part}
                </span>
              ))}
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
