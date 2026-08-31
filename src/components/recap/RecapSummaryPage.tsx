'use client'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowClockwise, ArrowsClockwise } from '@phosphor-icons/react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { localizeBibleBook } from '@/lib/bible-books'
import RecapPage from '@/components/recap/RecapPage'
import RecapRefreshInfo from '@/components/recap/RecapRefreshInfo'
import type { BookSummary } from '@/lib/ai'
import type { RefreshMeta, SummaryResponse } from '@/lib/recap-summary'

export type SummaryState =
  | { kind: 'loading' }
  | { kind: 'done'; items: BookSummary[] }
  /** 沒有東西可以整理（這個月沒寫反思） */
  | { kind: 'empty' }
  /** 有東西但這次沒生成出來，可以重試 */
  | { kind: 'failed' }

export type BookSummaryHandle = ReturnType<typeof useBookSummary>

/**
 * 抓 AI 摘要。刻意放在 RecapContent 呼叫，而不是留在這一頁裡面。
 *
 * 手冊同時只有兩頁掛在 DOM 上，這頁要等使用者翻到才會掛載——請求跟著掛載發出的話，
 * 每月第一次開回顧的人一定會盯著骨架等好幾秒。在開書的那一刻就發，使用者翻兩頁的
 * 時間剛好夠生成，翻到時通常已經填好了。
 *
 * 這裡發的一律是 refresh: false，所以自動打開回顧（含月初簽到彈窗）永遠不扣次數。
 *
 * enabled=false（這個月沒寫過反思）就完全不打，直接是 empty。
 */
export function useBookSummary(month: string, enabled: boolean) {
  const [state, setState] = useState<SummaryState>({ kind: 'loading' })
  /** 剩餘/總共的重新整理次數。沒有摘要可看時是 null，頁尾那一行就不出現 */
  const [meta, setMeta] = useState<RefreshMeta | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)
  /** 最近一次真的呼叫 AI 花了多久。只有 admin 的畫面會顯示 */
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  // 重試就是把 effect 再跑一次
  const [attempt, setAttempt] = useState(0)
  // 連點要用 ref 擋，不能用 refreshing 這個 state：同一個 tick 內連按兩下，
  // 兩次讀到的都還是 false，等於白白扣掉兩次。
  const busy = useRef(false)
  const mounted = useRef(true)
  // 掛載時一定要設回 true：dev 的 StrictMode 會 mount → unmount → mount，
  // 只寫 cleanup 的話第一次的 unmount 就把它永久設成 false，之後每次重整
  // 都會在「回應到了但元件還在不在」那關早退，setRefreshing(false) 跑不到，
  // 圖示就一直轉。
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const post = useCallback(async (refresh: boolean): Promise<SummaryResponse | null> => {
    try {
      const res = await fetch('/api/recap/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, ...(refresh && { refresh: true }) }),
      })
      return res.ok ? (await res.json()) as SummaryResponse : null
    } catch {
      return null
    }
  }, [month])

  useEffect(() => {
    if (!enabled) {
      setMeta(null)
      return setState({ kind: 'empty' })
    }

    let alive = true
    setState({ kind: 'loading' })

    void (async () => {
      const data = await post(false)
      if (!alive) return
      if (!data) return setState({ kind: 'failed' })
      setMeta(data.refresh ?? null)
      setIsAdmin(data.isAdmin === true)
      setElapsedMs(data.elapsedMs ?? null)
      const items = data.summary ?? []
      if (items.length) return setState({ kind: 'done', items })
      // API 用 failed 區分「AI 沒生成成功」和「本來就沒東西」，
      // 前者才給重試——沒寫反思的人按重試永遠不會有結果。
      setState(data.failed ? { kind: 'failed' } : { kind: 'empty' })
    })()

    return () => { alive = false }
  }, [post, enabled, attempt])

  /**
   * 手動重新整理。刻意不切回 loading：舊摘要留在畫面上，只讓圖示轉起來——
   * 使用者已經讀過這一頁了，把它換成骨架等好幾秒，比看著舊的等更難受。
   */
  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setRefreshing(true)
    setRefreshFailed(false)

    const data = await post(true)
    busy.current = false
    if (!mounted.current) return
    setRefreshing(false)

    if (!data) return setRefreshFailed(true)
    setMeta(data.refresh ?? null)
    setIsAdmin(data.isAdmin === true)
    setElapsedMs(data.elapsedMs ?? null)
    if (data.refreshFailed) return setRefreshFailed(true)
    if (data.summary?.length) setState({ kind: 'done', items: data.summary })
  }, [post])

  const retry = useCallback(() => setAttempt(n => n + 1), [])

  return { state, meta, refreshing, refreshFailed, elapsedMs, isAdmin, retry, refresh }
}

/**
 * AI 依書卷整理的反思摘要。
 *
 * 產完會快取，內容變動時系統自己補算；使用者想把新寫的立刻整理進來，就用當月
 * 掙到的次數手動重整（見 RecapRefreshInfo 的規則卡）。
 */
export default function RecapSummaryPage({
  page, summary, hasReflections,
}: {
  page: number
  summary: BookSummaryHandle
  /** false 時是這個月完全沒寫反思，empty 狀態要多加一句鼓勵去寫 */
  hasReflections: boolean
}) {
  const { t, locale } = useI18n()
  const { state, retry } = summary

  return (
    <RecapPage page={page} stagger={false}>
      {/* 問號跟標題放一起：規則講的是「這一頁怎麼來的」，掛在頁尾會變成
          重整按鈕的附屬品，還沒有摘要可看的狀態（沒寫留言）也看不到。 */}
      <div className="flex items-center gap-1.5 mb-3">
        <p className="text-[11px] tracking-wider text-gray-500">{t('recap.summaryTitle')}</p>
        <RecapRefreshInfo />
      </div>

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
            onClick={retry}
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
              // 書卷名不保證唯一：模型偶爾會把同一卷拆成兩筆，而且既有快取裡
              // 已經存著這種資料，光靠伺服器端去重救不了舊的列。
              <div key={`${s.book}-${i}`} className="recap-reveal" style={{ '--n': i } as CSSProperties}>
                <p className="text-sm font-bold text-heading">{localizeBibleBook(s.book, locale)}</p>
                <p className="text-sm text-gray-800 leading-relaxed mt-0.5">{s.summary}</p>
              </div>
            ))}
          </div>

          <RefreshFooter summary={summary} />

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

/**
 * 重新整理那一行：一顆圖示按鈕、一個 4/5 的分數（admin 是 ∞ 加上生成秒數）。
 *
 * 規則收在標題旁邊那顆問號的卡裡，這一行不放任何解釋性文字——這頁的主角是
 * 使用者自己寫的東西，底下掛三行說明會把它壓掉。
 */
function RefreshFooter({ summary }: { summary: BookSummaryHandle }) {
  const { t } = useI18n()
  const { meta, refreshing, refreshFailed, elapsedMs, isAdmin, refresh } = summary
  if (!meta) return null

  return (
    <div className="mt-5 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing || (!meta.unlimited && meta.remaining === 0)}
          aria-label={t('recap.summaryRefreshAria')}
          className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 active:opacity-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ArrowsClockwise size={16} weight="bold" className={refreshing ? 'animate-spin' : ''} />
        </button>
        {/* 字級用 rem，跟設定裡的字體大小一起放大 */}
        <span className="text-[0.7rem] tabular-nums text-gray-500">
          {meta.unlimited
            ? t('recap.summaryRefreshUnlimited')
            : t('recap.summaryRefreshCount', { remaining: meta.remaining, total: meta.total })}
        </span>
        {/* 生成耗時只給 admin 看：一般使用者不需要知道，也會把這一行變雜。
            秒數留一位小數——這件事的量級是「幾秒」，毫秒精度沒有意義。 */}
        {isAdmin && elapsedMs !== null && (
          <span className="text-[0.7rem] tabular-nums text-gray-400">
            {t('recap.summaryRefreshElapsed', { seconds: (elapsedMs / 1000).toFixed(1) })}
          </span>
        )}
      </div>

      {refreshFailed && (
        <p className="text-[0.7rem] text-gray-400 mt-1.5">{t('recap.summaryRefreshFailed')}</p>
      )}
    </div>
  )
}
