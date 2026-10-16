'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChatCircle } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { useBadgeToast } from '@/components/layout/BadgeToast'
import { useI18n } from '@/components/i18n/I18nProvider'
import { PromptGhost, PromptHeaderControls, useReflectionHint } from './ReflectionPromptHint'

export default function ReflectionForm({ date, bibleRange, lang }: { date: string; bibleRange: string | null; lang: 'zh' | 'en' }) {
  const router = useRouter()
  const { t } = useI18n()
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [error, setError] = useState('')
  const [draftOwnerId, setDraftOwnerId] = useState<string | null>(null)
  const [draftReady, setDraftReady] = useState(false)
  const { showBadges } = useBadgeToast()
  const MAX = 1000

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const ai = useReflectionHint({ date, lang, content, setContent, submitted, textareaRef })

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || cancelled) return
      setDraftOwnerId(user.id)
      const { data } = await supabase
        .from('reflections')
        .select('content, is_anonymous')
        .eq('user_id', user.id)
        .eq('note_date', date)
        .maybeSingle()
      if (cancelled) return
      if (data) {
        setContent(data.content)
        setIsAnonymous(data.is_anonymous)
        setSubmitted(true)
      } else {
        try {
          const draft = localStorage.getItem(`reflection-draft:${user.id}:${date}`)
          if (draft) {
            const parsed = JSON.parse(draft) as { content?: unknown; isAnonymous?: unknown }
            if (typeof parsed.content === 'string') setContent(parsed.content.slice(0, MAX))
            if (typeof parsed.isAnonymous === 'boolean') setIsAnonymous(parsed.isAnonymous)
          }
        } catch {}
      }
      setDraftReady(true)
    })
    return () => { cancelled = true }
  }, [date])

  useEffect(() => {
    if (!draftReady || !draftOwnerId || submitted) return
    try {
      const key = `reflection-draft:${draftOwnerId}:${date}`
      if (!content && !isAnonymous) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify({ content, isAnonymous }))
    } catch {}
  }, [content, isAnonymous, date, draftOwnerId, draftReady, submitted])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_date: date, content, is_anonymous: isAnonymous, bible_range: bibleRange }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setPointsEarned(data.points_earned ?? 0)
        if (data.badges_unlocked?.length) showBadges(data.badges_unlocked)
        setSubmitted(true)
        if (draftOwnerId) {
          try { localStorage.removeItem(`reflection-draft:${draftOwnerId}:${date}`) } catch {}
        }
        router.refresh()
        router.push(`/community?scrollTo=${date}`)
      } else {
        setError(t('community.submitFail'))
      }
    } catch {
      setError(t('community.submitFail'))
    } finally {
      setLoading(false)
    }
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
      {/* relative：ⓘ 的說明卡片以這一列為定位基準 */}
      <div className="relative mb-2 flex items-center justify-between gap-2">
        {title}
        <PromptHeaderControls hint={ai.hint} hintsOn={ai.hintsOn} onToggle={ai.toggleHints} canSwap={ai.showGhost} />
      </div>

      {/* 輸入框和提示疊在同一格：提示比較長時，輸入框會跟著撐高 */}
      <div className="grid">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          {...ai.textareaProps}
          maxLength={MAX}
          rows={4}
          placeholder={ai.showGhost ? '' : t('community.thoughtPlaceholder')}
          className="col-start-1 row-start-1 w-full touch-manipulation border border-gray-200 rounded-xl px-4 py-3 text-sm leading-6 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        {ai.showGhost && <PromptGhost loading={ai.hint.loading} failed={ai.hint.failed} prompt={ai.hint.prompt} typed={ai.typed} typing={ai.typing} />}
      </div>

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
