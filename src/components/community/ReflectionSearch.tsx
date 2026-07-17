'use client'
import { useState, useRef, useEffect } from 'react'
import { MagnifyingGlass, X, DownloadSimple, ListBullets, Sparkle, Copy, Check, Plus } from '@phosphor-icons/react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { formatMonth } from '@/lib/utils'
import type { ReflectionFilters } from '@/types/app'

const CUSTOM_FILTER_CHIPS_KEY = 'reflection_custom_filter_chips'
const CUSTOM_SUMMARY_CHIPS_KEY = 'reflection_custom_summary_chips'

interface Props {
  todayBibleRange: string | null
  onFilter: (filters: ReflectionFilters | null) => void
}

function extractBookName(range: string): string {
  return range.replace(/\s*\d.*$/, '').trim()
}

type Step =
  | 'input'
  | 'choose'
  | 'filter_loading'
  | 'filter_done'
  | 'summary_confirm_loading'
  | 'summary_confirm'
  | 'summary_loading'
  | 'summary_done'

export default function ReflectionSearch({ todayBibleRange, onFilter }: Props) {
  const { t, locale } = useI18n()

  const bookName = todayBibleRange ? extractBookName(todayBibleRange) : null
  const defaultFilterChips = [
    t('community.chipMine'),
    bookName ? t('community.chipBook', { book: bookName }) : t('community.chipBookToday'),
  ]
  const defaultSummaryChips = [
    t('community.chipSummaryMine'),
    bookName ? t('community.chipSummaryBook', { book: bookName }) : t('community.chipSummaryToday'),
  ]

  // 顯示用：把篩選條件組成一句在地化描述（給確認框看）
  function formatConditions(f: ReflectionFilters): string {
    const parts: string[] = []
    if (f.month) parts.push(formatMonth(f.month, locale))
    if (f.selfOnly) parts.push(t('community.condMine'))
    else if (f.user_name) parts.push(t('community.condUser', { name: f.user_name }))
    if (f.bible_book) parts.push(t('community.condBook', { book: f.bible_book }))
    if (f.keyword) parts.push(t('community.condKeyword', { keyword: f.keyword }))
    return parts.length > 0 ? parts.join(t('common.listSeparator')) : t('community.condAll')
  }

  // 從已套用的篩選組出送給 AI 的查詢字串（用 UI 語言，AI 便以該語言回覆）
  function buildQueryFromFilters(f: ReflectionFilters): string {
    const parts: string[] = []
    if (f.month) parts.push(formatMonth(f.month, locale))
    if (f.selfOnly) parts.push(t('community.queryMine'))
    else if (f.user_name) parts.push(t('community.queryUser', { name: f.user_name }))
    if (f.bible_book) parts.push(f.bible_book)
    if (f.keyword) parts.push(t('community.queryKeyword', { keyword: f.keyword }))
    const conditions = parts.length > 0 ? parts.join(t('common.listSeparator')) : t('community.queryAll')
    return t('community.summaryQueryTemplate', { conditions })
  }

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [step, setStep] = useState<Step>('input')
  const [answer, setAnswer] = useState<string | null>(null)
  const [parsedConditions, setParsedConditions] = useState<ReflectionFilters | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFiltered, setIsFiltered] = useState(false)
  const [activeFilter, setActiveFilter] = useState<ReflectionFilters | null>(null)
  const [copied, setCopied] = useState(false)

  const [customFilterChips, setCustomFilterChips] = useState<string[]>([])
  const [addingFilterChip, setAddingFilterChip] = useState(false)
  const [newFilterChip, setNewFilterChip] = useState('')

  const [customSummaryChips, setCustomSummaryChips] = useState<string[]>([])
  const [addingSummaryChip, setAddingSummaryChip] = useState(false)
  const [newSummaryChip, setNewSummaryChip] = useState('')

  const composingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const f = localStorage.getItem(CUSTOM_FILTER_CHIPS_KEY)
      if (f) setCustomFilterChips(JSON.parse(f))
      const s = localStorage.getItem(CUSTOM_SUMMARY_CHIPS_KEY)
      if (s) setCustomSummaryChips(JSON.parse(s))
    } catch {}
  }, [])

  function saveFilterChips(chips: string[]) {
    setCustomFilterChips(chips)
    try { localStorage.setItem(CUSTOM_FILTER_CHIPS_KEY, JSON.stringify(chips)) } catch {}
  }
  function saveSummaryChips(chips: string[]) {
    setCustomSummaryChips(chips)
    try { localStorage.setItem(CUSTOM_SUMMARY_CHIPS_KEY, JSON.stringify(chips)) } catch {}
  }

  const isLoading = step === 'filter_loading' || step === 'summary_confirm_loading' || step === 'summary_loading'

  function handleSubmit() {
    if (!query.trim() || isLoading) return
    setError(null)
    setAnswer(null)
    setParsedConditions(null)
    setStep('choose')
  }

  async function handleChooseFilter(chipQuery?: string) {
    const q = chipQuery !== undefined ? chipQuery : query
    if (!q) return
    setQuery(q)
    requestAnimationFrame(() => {
      if (inputRef.current) inputRef.current.scrollLeft = inputRef.current.scrollWidth
    })
    setStep('filter_loading')
    setError(null)
    try {
      const res = await fetch('/api/ai/parse-filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? t('community.parseFail'))
        setStep('choose')
        return
      }
      const f = data.filters as ReflectionFilters
      const hasFilter = !!(f?.month || f?.selfOnly || f?.user_name || f?.bible_book || f?.keyword)
      if (!hasFilter) {
        setError('目前支援的篩選條件：月份、聖經書卷、關鍵字、自己的留言、指定用戶的留言')
        setStep(chipQuery ? 'input' : 'choose')
        return
      }
      onFilter(f)
      setActiveFilter(f)
      setIsFiltered(true)
      setStep('filter_done')
    } catch {
      setError(t('community.networkError'))
      setStep(chipQuery ? 'input' : 'choose')
    }
  }

  async function handleChooseSummary(chipQuery?: string) {
    const q = chipQuery !== undefined ? chipQuery : query
    if (!q) return
    setQuery(q)
    requestAnimationFrame(() => {
      if (inputRef.current) inputRef.current.scrollLeft = inputRef.current.scrollWidth
    })
    setStep('summary_confirm_loading')
    setError(null)
    try {
      const res = await fetch('/api/ai/parse-filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      if (res.ok) {
        setParsedConditions(data.filters as ReflectionFilters)
        setStep('summary_confirm')
      } else {
        await executeSummary(q)
      }
    } catch {
      await executeSummary(q)
    }
  }

  async function executeSummary(queryOverride?: string) {
    const q = queryOverride !== undefined ? queryOverride : query
    setStep('summary_loading')
    setError(null)
    try {
      const res = await fetch('/api/ai/search-reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, locale }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? t('community.searchFail'))
        setStep('choose')
      } else {
        setAnswer(data.answer)
        setStep('summary_done')
      }
    } catch {
      setError(t('community.networkError'))
      setStep('choose')
    }
  }

  function handleAISummaryFromFilter() {
    if (!activeFilter) return
    const q = buildQueryFromFilters(activeFilter)
    setIsOpen(true)
    handleChooseSummary(q)
  }

  async function handleDownload() {
    if (!answer) return
    if (navigator.share) {
      try { await navigator.share({ title: t('community.downloadName'), text: answer }) }
      catch (e) { if ((e as Error).name !== 'AbortError') throw e }
    } else {
      const blob = new Blob([answer], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${t('community.downloadName')}.txt`; a.click()
      URL.revokeObjectURL(url)
    }
  }

  function handleClearFilter() {
    onFilter(null)
    setIsFiltered(false)
    setActiveFilter(null)
    setStep('input')
    setQuery('')
    setAnswer(null)
    setError(null)
  }

  function handleClose() {
    setIsOpen(false)
    setAnswer(null)
    setError(null)
    setQuery('')
    setParsedConditions(null)
    if (step !== 'filter_done') setStep('input')
  }

  const showInput = step !== 'filter_done'

  return (
    <div className="w-full min-w-0">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <span className="text-sm font-semibold text-heading">{t('community.tabFeed')}</span>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {isFiltered && (
            <>
              <button
                onClick={handleAISummaryFromFilter}
                className="shrink-0 text-xs text-primary-dark bg-primary-light px-2.5 py-0.5 rounded-full border border-primary flex items-center gap-1"
              >
                <Sparkle size={10} weight="fill" /> {t('community.aiSummary')}
              </button>
              <button
                onClick={handleClearFilter}
                className="shrink-0 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 flex items-center gap-1"
              >
                {t('community.filtering')} <X size={10} weight="bold" />
              </button>
            </>
          )}
          <button
            onClick={() => isOpen ? handleClose() : setIsOpen(true)}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={t('community.aiSearchAria')}
          >
            <MagnifyingGlass size={18} weight="regular" />
          </button>
        </div>
      </div>

      {/* Collapsible search panel */}
      {isOpen && (
        <div className="mb-4 bg-surface rounded-2xl p-4 shadow-sm border border-gray-100">
          {/* Panel header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">{t('community.aiSearchTitle')}</span>
            <button onClick={handleClose} className="p-0.5 text-gray-300 hover:text-gray-500 transition-colors">
              <X size={15} weight="bold" />
            </button>
          </div>

          {/* Input row */}
          {showInput && (
            <>
              {step === 'input' && (
                <div className="mb-3 space-y-3">
                  {/* List query chips */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-400 mb-1.5 flex items-center gap-1">
                      <ListBullets size={11} weight="bold" /> {t('community.listQuery')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {defaultFilterChips.map(chip => (
                        <button
                          key={chip}
                          onClick={() => handleChooseFilter(chip)}
                          className="text-xs bg-rose-50 text-rose-700 px-2.5 py-1 rounded-xl border border-rose-200 hover:bg-rose-100 transition-colors text-left"
                        >
                          {chip}
                        </button>
                      ))}
                      {customFilterChips.map(chip => (
                        <span key={chip} className="flex items-center gap-0.5 bg-rose-50 rounded-xl pl-2.5 pr-1 py-1 border border-rose-200">
                          <button
                            onClick={() => handleChooseFilter(chip)}
                            className="text-xs text-rose-700 hover:text-rose-900 transition-colors"
                          >
                            {chip}
                          </button>
                          <button
                            onClick={() => saveFilterChips(customFilterChips.filter(c => c !== chip))}
                            className="p-0.5 text-rose-300 hover:text-red-400 transition-colors"
                          >
                            <X size={10} weight="bold" />
                          </button>
                        </span>
                      ))}
                    </div>
                    {addingFilterChip ? (
                      <div className="flex gap-1.5 mt-2">
                        <input
                          autoFocus
                          type="text"
                          value={newFilterChip}
                          onChange={e => setNewFilterChip(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const t = newFilterChip.trim()
                              if (t && !customFilterChips.includes(t)) saveFilterChips([...customFilterChips, t])
                              setNewFilterChip(''); setAddingFilterChip(false)
                            }
                            if (e.key === 'Escape') { setAddingFilterChip(false); setNewFilterChip('') }
                          }}
                          placeholder={t('community.chipFilterPlaceholder')}
                          className="flex-1 min-w-0 bg-gray-100 rounded-xl px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            const t = newFilterChip.trim()
                            if (t && !customFilterChips.includes(t)) saveFilterChips([...customFilterChips, t])
                            setNewFilterChip(''); setAddingFilterChip(false)
                          }}
                          disabled={!newFilterChip.trim()}
                          className="text-xs text-gray-700 font-medium disabled:opacity-40 px-2"
                        >
                          {t('common.save')}
                        </button>
                        <button onClick={() => { setAddingFilterChip(false); setNewFilterChip('') }} className="text-xs text-gray-400 px-1">
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingFilterChip(true)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-2"
                      >
                        <Plus size={11} /> {t('community.addQuestion')}
                      </button>
                    )}
                  </div>

                  {/* AI summary chips */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-dark mb-1.5 flex items-center gap-1">
                      <Sparkle size={11} weight="fill" /> {t('community.aiOrganize')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {defaultSummaryChips.map(chip => (
                        <button
                          key={chip}
                          onClick={() => handleChooseSummary(chip)}
                          className="text-xs bg-primary-light text-primary-dark px-2.5 py-1 rounded-xl border border-primary hover:bg-primary-light transition-colors text-left"
                        >
                          {chip}
                        </button>
                      ))}
                      {customSummaryChips.map(chip => (
                        <span key={chip} className="flex items-center gap-0.5 bg-primary-light rounded-xl pl-2.5 pr-1 py-1 border border-primary">
                          <button
                            onClick={() => handleChooseSummary(chip)}
                            className="text-xs text-primary-dark hover:text-primary-dark transition-colors"
                          >
                            {chip}
                          </button>
                          <button
                            onClick={() => saveSummaryChips(customSummaryChips.filter(c => c !== chip))}
                            className="p-0.5 text-primary hover:text-red-400 transition-colors"
                          >
                            <X size={10} weight="bold" />
                          </button>
                        </span>
                      ))}
                    </div>
                    {addingSummaryChip ? (
                      <div className="flex gap-1.5 mt-2">
                        <input
                          autoFocus
                          type="text"
                          value={newSummaryChip}
                          onChange={e => setNewSummaryChip(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const t = newSummaryChip.trim()
                              if (t && !customSummaryChips.includes(t)) saveSummaryChips([...customSummaryChips, t])
                              setNewSummaryChip(''); setAddingSummaryChip(false)
                            }
                            if (e.key === 'Escape') { setAddingSummaryChip(false); setNewSummaryChip('') }
                          }}
                          placeholder={t('community.chipSummaryPlaceholder')}
                          className="flex-1 min-w-0 bg-gray-100 rounded-xl px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            const t = newSummaryChip.trim()
                            if (t && !customSummaryChips.includes(t)) saveSummaryChips([...customSummaryChips, t])
                            setNewSummaryChip(''); setAddingSummaryChip(false)
                          }}
                          disabled={!newSummaryChip.trim()}
                          className="text-xs text-primary-dark font-medium disabled:opacity-40 px-2"
                        >
                          {t('common.save')}
                        </button>
                        <button onClick={() => { setAddingSummaryChip(false); setNewSummaryChip('') }} className="text-xs text-gray-400 px-1">
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingSummaryChip(true)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-2"
                      >
                        <Plus size={11} /> {t('community.addQuestion')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value)
                    if (['choose', 'summary_confirm', 'summary_done'].includes(step)) setStep('input')
                  }}
                  onCompositionStart={() => { composingRef.current = true }}
                  onCompositionEnd={() => { setTimeout(() => { composingRef.current = false }, 0) }}
                  onKeyDown={e => e.key === 'Enter' && !composingRef.current && !isLoading && handleSubmit()}
                  placeholder={t('community.searchPlaceholder')}
                  className="flex-1 min-w-0 bg-gray-100 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                />
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !query.trim()}
                  className="btn-gradient text-gray-900 text-sm px-4 py-2 rounded-xl font-medium disabled:opacity-40 shrink-0"
                >
                  {t('community.search')}
                </button>
              </div>
            </>
          )}

          {/* Mode choice */}
          {step === 'choose' && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-500 mb-2">{t('community.chooseMode')}</p>
              <button
                onClick={() => handleChooseFilter()}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
              >
                <ListBullets size={20} className="text-gray-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{t('community.listMode')}</p>
                  <p className="text-xs text-gray-400">{t('community.listModeDesc')}</p>
                </div>
              </button>
              <button
                onClick={() => handleChooseSummary()}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-primary hover:bg-primary-light transition-colors text-left"
              >
                <Sparkle size={20} className="text-primary-dark shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{t('community.aiMode')}</p>
                  <p className="text-xs text-gray-400">{t('community.aiModeDesc')}</p>
                </div>
              </button>
            </div>
          )}

          {/* Summary confirm */}
          {step === 'summary_confirm' && parsedConditions !== null && (
            <div className="mt-3 space-y-3">
              <div className="p-3 bg-primary-light rounded-xl border border-primary-light">
                <p className="text-xs text-primary-dark font-medium mb-1">{t('community.summaryConfirm')}</p>
                <p className="text-sm text-gray-700">{formatConditions(parsedConditions)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => executeSummary()}
                  className="flex-1 btn-gradient text-gray-900 text-sm py-2 rounded-xl font-medium"
                >
                  {t('community.confirmStart')}
                </button>
                <button
                  onClick={() => { setStep('input'); setParsedConditions(null) }}
                  className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {t('community.editDescription')}
                </button>
              </div>
            </div>
          )}

          {/* Loading states */}
          {step === 'filter_loading' && (
            <p className="mt-4 text-sm text-gray-400 animate-pulse">{t('community.parsingFilter')}</p>
          )}
          {step === 'summary_confirm_loading' && (
            <p className="mt-4 text-sm text-gray-400 animate-pulse">{t('community.parsingQuery')}</p>
          )}
          {step === 'summary_loading' && (
            <p className="mt-4 text-sm text-gray-400 animate-pulse">{t('community.organizing')}</p>
          )}

          {/* Filter done */}
          {step === 'filter_done' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">{t('community.filterApplied')}</p>
              <button
                onClick={handleClearFilter}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline"
              >
                {t('community.clearFilter')}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="mt-4 text-sm text-red-500">{error}</p>
          )}

          {/* Summary result */}
          {step === 'summary_done' && answer && (
            <div className="mt-4">
              <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700 leading-6 whitespace-pre-wrap">
                {answer}
              </div>
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <DownloadSimple size={14} />
                  {t('community.shareDownload')}
                </button>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(answer)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {copied ? t('community.copied') : t('community.copyText')}
                </button>
                <button
                  onClick={() => { setStep('input'); setAnswer(null); setQuery('') }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline ml-auto"
                >
                  {t('community.reDescribe')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
