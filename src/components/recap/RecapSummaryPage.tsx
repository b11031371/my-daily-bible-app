'use client'
import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { ArrowClockwise } from '@phosphor-icons/react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { localizeBibleBook } from '@/lib/bible-books'
import RecapPage from '@/components/recap/RecapPage'
import type { BookSummary } from '@/lib/ai'

export type SummaryState =
  | { kind: 'loading' }
  | { kind: 'done'; items: BookSummary[] }
  /** 沒有東西可以整理（這個月沒寫反思） */
  | { kind: 'empty' }
  /** 有東西但這次沒生成出來，可以重試 */
  | { kind: 'failed' }

/**
 * 抓 AI 摘要。刻意放在 RecapContent 呼叫，而不是留在這一頁裡面。
 *
 * 手冊同時只有兩頁掛在 DOM 上，這頁要等使用者翻到才會掛載——請求跟著掛載發出的話，
 * 每月第一次開回顧的人一定會盯著骨架等好幾秒。在開書的那一刻就發，使用者翻兩頁的
 * 時間剛好夠生成，翻到時通常已經填好了。
 *
 * enabled=false（這個月沒寫過反思）就完全不打，直接是 empty。
 */
export function useBookSummary(month: string, enabled: boolean) {
  const [state, setState] = useState<SummaryState>({ kind: 'loading' })
  // 重試就是把 effect 再跑一次
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return setState({ kind: 'empty' })

    let alive = true
    setState({ kind: 'loading' })

    void (async () => {
      try {
        const res = await fetch('/api/recap/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month }),
        })
        if (!alive) return
        if (!res.ok) return setState({ kind: 'failed' })
        const data = await res.json()
        const items = (data.summary ?? []) as BookSummary[]
        if (items.length) return setState({ kind: 'done', items })
        // API 用 failed 區分「AI 沒生成成功」和「本來就沒東西」，
        // 前者才給重試——沒寫反思的人按重試永遠不會有結果。
        setState(data.failed ? { kind: 'failed' } : { kind: 'empty' })
      } catch {
        if (alive) setState({ kind: 'failed' })
      }
    })()

    return () => { alive = false }
  }, [month, enabled, attempt])

  const retry = useCallback(() => setAttempt(n => n + 1), [])

  return { state, retry }
}

/**
 * AI 依書卷整理的反思摘要。
 *
 * 產完就永久快取（recap_summaries），所以只有每月第一次開回顧會真的等。
 */
export default function RecapSummaryPage({
  page, state, onRetry, hasReflections,
}: {
  page: number
  state: SummaryState
  onRetry: () => void
  /** false 時是這個月完全沒寫反思，empty 狀態要多加一句鼓勵去寫 */
  hasReflections: boolean
}) {
  const { t, locale } = useI18n()

  return (
    <RecapPage page={page} stagger={false}>
      <p className="text-[11px] tracking-wider text-gray-500 mb-3">{t('recap.summaryTitle')}</p>

      {state.kind === 'loading' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{t('recap.summaryPending')}</p>
          {/* 骨架用兩段長短不一的線，讓等待看起來是在生成文字而不是卡住 */}
          {[0, 1].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-2.5 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-2.5 w-4/5 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {state.kind === 'empty' && (
        <div>
          {/* 兩種 empty 不一樣：完全沒寫 vs 寫了但東西太少整理不出來 */}
          <p className="text-sm text-gray-500">
            {t(hasReflections ? 'recap.summaryEmpty' : 'recap.summaryEmptyZero')}
          </p>
          {!hasReflections && (
            <p className="text-sm text-gray-500 mt-2">{t('recap.summaryEmptyNudge')}</p>
          )}
        </div>
      )}

      {state.kind === 'failed' && (
        <div>
          <p className="text-sm text-gray-500">{t('recap.summaryFailed')}</p>
          {/* 摘要是「這次沒有也不影響其他頁」的東西，所以重試做成一行淡淡的文字，
              不做成主要按鈕去搶走整頁的注意力。 */}
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 mt-2 text-sm text-heading active:opacity-50"
          >
            <ArrowClockwise size={14} weight="bold" />
            {t('recap.summaryRetry')}
          </button>
        </div>
      )}

      {state.kind === 'done' && (
        <>
          <div className="space-y-4">
            {state.items.map((s, i) => (
              <div key={s.book} className="recap-reveal" style={{ '--n': i } as CSSProperties}>
                <p className="text-sm font-bold text-heading">{localizeBibleBook(s.book, locale)}</p>
                <p className="text-sm text-gray-800 leading-relaxed mt-0.5">{s.summary}</p>
              </div>
            ))}
          </div>

          {/* 這頁的字是機器寫的，該說；但這是使用者自己一個月的反思被回讀給他聽的
              時刻，用一整條提示框宣告會把那個時刻打斷。做成頁尾的一行小字：
              想知道的人看得到，也不會擋在內容前面。
              字級用 rem，跟著設定裡的字體大小一起放大。 */}
          <p className="text-[0.65rem] text-gray-400 mt-5">{t('recap.summaryAiNote')}</p>
        </>
      )}
    </RecapPage>
  )
}
