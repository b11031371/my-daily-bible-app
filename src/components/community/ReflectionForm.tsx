'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBadgeToast } from '@/components/layout/BadgeToast'
import { useI18n } from '@/components/i18n/I18nProvider'

export default function ReflectionForm({ date, bibleRange }: { date: string; bibleRange: string | null }) {
  const router = useRouter()
  const { t } = useI18n()
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)
  const { showBadges } = useBadgeToast()
  const MAX = 1000

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
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
    }
    setLoading(false)
  }

  if (submitted && !loading) {
    return (
      <div>
        {pointsEarned > 0 && (
          <div className="text-xs text-gray-700 font-medium mb-2">{t('community.pointsEarned', { points: pointsEarned })}</div>
        )}
        <div className="bg-[#f5f3ee] rounded-xl p-4 text-sm text-gray-700 leading-6 whitespace-pre-wrap">
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
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        maxLength={MAX}
        rows={4}
        placeholder={t('community.thoughtPlaceholder')}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm leading-6 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex items-center justify-between mt-2">
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
          <div
            onClick={() => setIsAnonymous(v => !v)}
            className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${isAnonymous ? 'bg-primary' : 'bg-gray-200'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isAnonymous ? 'translate-x-4' : ''}`} />
          </div>
          {t('community.postAnonymously')}
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{content.length}/{MAX}</span>
          <button
            type="submit"
            disabled={loading || content.trim().length === 0}
            className="bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 text-sm px-4 py-1.5 rounded-full font-medium disabled:opacity-40 hover:brightness-95 transition-[filter]"
          >
            {loading ? t('community.submitting') : t('community.submit')}
          </button>
        </div>
      </div>
    </form>
  )
}
