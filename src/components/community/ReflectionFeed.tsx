'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, PencilSimple, Trash, ChatCircle, Check, X, BookOpen } from '@phosphor-icons/react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { localizeBibleRange } from '@/lib/bible-books'
import { useI18n } from '@/components/i18n/I18nProvider'
import type { TFunc } from '@/lib/i18n'
import type { ReflectionWithProfile, ReflectionComment } from '@/types/app'
import BibleAvatar from '@/components/avatar/BibleAvatar'

function relativeTime(iso: string, t: TFunc): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return t('community.justNow')
  if (diff < 3600) return t('community.minutesAgo', { count: Math.floor(diff / 60) })
  if (diff < 86400) return t('community.hoursAgo', { count: Math.floor(diff / 3600) })
  return t('community.daysAgo', { count: Math.floor(diff / 86400) })
}

// Phosphor Heart fill path at viewBox="0 0 256 256"
const HEART_FILL_PATH = 'M240,102c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,228.66,16,172,16,102A62.07,62.07,0,0,1,78,40c20.65,0,38.73,8.88,50,23.89C139.27,48.88,157.35,40,178,40A62.07,62.07,0,0,1,240,102Z'

function GradientHeartFill({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" aria-hidden>
      <path fill="url(#rl-heart-grad)" d={HEART_FILL_PATH} />
    </svg>
  )
}

interface Props {
  reflections: ReflectionWithProfile[]
  currentUserId: string | null
  currentUserAvatarSeed: string | null
  currentUserIsAdmin: boolean
  scrollTo?: string
}

// sessionStorage helpers — key: `rl:<id>`, value: '1' | '0'
function ssGet(id: string): boolean | null {
  try { const v = sessionStorage.getItem(`rl:${id}`); return v !== null ? v === '1' : null } catch { return null }
}
function ssSet(id: string, liked: boolean) {
  try { sessionStorage.setItem(`rl:${id}`, liked ? '1' : '0') } catch {}
}

function CommentItem({
  reflectionId, comment, isOwn, canDelete, onDelete, onSaved,
}: {
  reflectionId: string
  comment: ReflectionComment
  isOwn: boolean
  canDelete: boolean
  onDelete: (id: string) => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!editContent.trim() || saving) return
    setSaving(true)
    const res = await fetch(`/api/reflections/${reflectionId}/comments/${comment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent.trim() }),
    })
    setSaving(false)
    if (res.ok) { setEditMode(false); onSaved() }
  }

  return (
    <div className="flex gap-2">
      <BibleAvatar seed={comment.profiles?.avatar_seed ?? comment.user_id} className="w-6 h-6 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {editMode ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
              className="flex-1 min-w-0 bg-gray-100 rounded-xl px-3 py-1 text-xs text-gray-900 focus:outline-none"
            />
            <button onClick={handleSave} disabled={saving || !editContent.trim()} className="shrink-0 p-1 text-primary disabled:opacity-40">
              <Check size={14} weight="bold" />
            </button>
            <button onClick={() => { setEditMode(false); setEditContent(comment.content) }} className="shrink-0 p-1 text-gray-400">
              <X size={14} weight="bold" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-gray-800">{comment.profiles?.display_name ?? t('community.user')}</span>
              <span className="text-[10px] text-gray-400">{relativeTime(comment.created_at, t)}</span>
              <div className="ml-auto flex items-center gap-1">
                {isOwn && (
                  <button onClick={() => setEditMode(true)} className="p-0.5 text-gray-300 hover:text-gray-500 active:opacity-50 transition-colors">
                    <PencilSimple size={11} />
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => onDelete(comment.id)} className="p-0.5 text-gray-300 hover:text-danger active:opacity-50 transition-colors">
                    <Trash size={11} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-600 leading-5">{comment.content}</p>
          </>
        )}
      </div>
    </div>
  )
}

function ReflectionCard({
  r, currentUserId, currentUserAvatarSeed, currentUserIsAdmin, onDelete,
}: {
  r: ReflectionWithProfile
  currentUserId: string | null
  currentUserAvatarSeed: string | null
  currentUserIsAdmin: boolean
  onDelete: (id: string) => void
}) {
  const router = useRouter()
  const { t } = useI18n()
  const isOwn = currentUserId === r.user_id

  // Displayed content/anon can change after an inline edit
  const [displayContent, setDisplayContent] = useState(r.content)
  const [isAnonymous, setIsAnonymous] = useState(r.is_anonymous)

  const name = isAnonymous ? t('community.anonymous') : r.profiles?.display_name ?? t('community.user')
  const seed = isAnonymous ? 'anon' : (r.profiles?.avatar_seed ?? r.user_id)

  const serverLiked = currentUserId ? r.reflection_likes.some(l => l.user_id === currentUserId) : false
  const serverCount = r.reflection_likes.length
  const serverSeeds = r.reflection_likes.slice(0, 3).map(l => l.profiles?.avatar_seed ?? l.user_id)

  const [liked, setLiked] = useState(serverLiked)
  const [count, setCount] = useState(serverCount)
  const [displaySeeds, setDisplaySeeds] = useState(serverSeeds)

  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState(r.content)
  const [editAnon, setEditAnon] = useState(r.is_anonymous)
  const [editLoading, setEditLoading] = useState(false)

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Comments
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleAddComment() {
    if (!commentInput.trim() || submitting) return
    setSubmitting(true)
    await fetch(`/api/reflections/${r.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentInput.trim() }),
    })
    setCommentInput('')
    setSubmitting(false)
    router.refresh()
  }

  async function handleDeleteComment(commentId: string) {
    await fetch(`/api/reflections/${r.id}/comments/${commentId}`, { method: 'DELETE' })
    router.refresh()
  }

  // Restore like state from sessionStorage after mount (survives tab switching)
  useEffect(() => {
    const stored = ssGet(r.id)
    if (stored === null) return
    if (stored === serverLiked) return
    setLiked(stored)
    setCount(serverCount + (stored ? 1 : -1))
    if (stored && currentUserAvatarSeed) {
      setDisplaySeeds(prev =>
        prev.includes(currentUserAvatarSeed) ? prev : [currentUserAvatarSeed, ...prev].slice(0, 3)
      )
    } else if (!stored && currentUserAvatarSeed) {
      setDisplaySeeds(prev => prev.filter(s => s !== currentUserAvatarSeed))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.id])

  async function toggleLike() {
    if (!currentUserId) return
    const next = !liked
    setLiked(next)
    setCount(c => c + (next ? 1 : -1))
    ssSet(r.id, next)
    if (next && currentUserAvatarSeed) {
      setDisplaySeeds(prev =>
        prev.includes(currentUserAvatarSeed) ? prev : [currentUserAvatarSeed, ...prev].slice(0, 3)
      )
    } else if (!next && currentUserAvatarSeed) {
      setDisplaySeeds(prev => prev.filter(s => s !== currentUserAvatarSeed))
    }
    await fetch(`/api/reflections/${r.id}/like`, { method: next ? 'POST' : 'DELETE' })
  }

  async function handleDelete() {
    const res = await fetch(`/api/reflections/${r.id}`, { method: 'DELETE' })
    if (res.ok) onDelete(r.id)
    else setConfirmDelete(false)
  }

  async function handleSaveEdit() {
    if (!editContent.trim()) return
    setEditLoading(true)
    const res = await fetch(`/api/reflections/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent.trim(), is_anonymous: editAnon }),
    })
    setEditLoading(false)
    if (res.ok) {
      setDisplayContent(editContent.trim())
      setIsAnonymous(editAnon)
      setEditMode(false)
      router.refresh()
    }
  }

  function startEdit() {
    setEditContent(displayContent)
    setEditAnon(isAnonymous)
    setEditMode(true)
  }

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <BibleAvatar seed={seed} className="w-7 h-7 shrink-0" />
        <span className="text-sm font-medium text-gray-900 truncate">{name}</span>
      </div>

      {editMode ? (
        /* Inline edit form */
        <div className="mt-2">
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            maxLength={1000}
            rows={4}
            autoFocus
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm leading-6 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
              <div
                onClick={() => setEditAnon(v => !v)}
                className={`w-8 h-4 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${editAnon ? 'bg-primary' : 'bg-gray-200'}`}
              >
                <div className={`w-3 h-3 bg-surface rounded-full shadow transition-transform ${editAnon ? 'translate-x-4' : ''}`} />
              </div>
              {t('community.anonymous')}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditMode(false)}
                className="text-xs text-gray-400 hover:text-gray-600 active:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading || !editContent.trim()}
                className="text-xs font-medium btn-gradient text-gray-900 px-3 py-1 rounded-full disabled:opacity-40"
              >
                {editLoading ? t('settings.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Content */}
          <p className="text-sm text-gray-700 leading-6 whitespace-pre-wrap mb-3">{displayContent}</p>

          {/* Action row */}
          <div className="flex items-center justify-between">
            {/* Left: own-reflection edit/delete */}
            {isOwn ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{t('community.confirmDelete')}</span>
                  <button onClick={handleDelete} className="text-xs text-danger font-medium hover:opacity-70 active:opacity-50 transition-opacity">{t('community.delete')}</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 hover:text-gray-600 active:opacity-50">{t('common.cancel')}</button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={startEdit}
                    className="p-1 text-gray-300 hover:text-gray-500 active:opacity-50 transition-colors"
                    aria-label={t('community.edit')}
                  >
                    <PencilSimple size={14} weight="regular" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-1 text-gray-300 hover:text-danger active:opacity-50 transition-colors"
                    aria-label={t('community.delete')}
                  >
                    <Trash size={14} weight="regular" />
                  </button>
                </div>
              )
            ) : (
              <div />
            )}

            {/* Right: comment toggle + like */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCommentsOpen(v => !v)}
                className="flex items-center gap-1 p-1 text-gray-300 hover:text-gray-500 active:opacity-50 transition-colors"
                aria-label={t('community.reply')}
              >
                <ChatCircle size={18} weight="regular" />
                {r.reflection_comments.length > 0 && (
                  <span className="text-xs tabular-nums">{r.reflection_comments.length}</span>
                )}
              </button>
              <div className="flex items-center gap-1.5">
                {count > 0 && (
                  <div className="flex items-center -space-x-1.5">
                    {displaySeeds.map((s, i) => (
                      <BibleAvatar key={i} seed={s} className="w-5 h-5 ring-1 ring-white rounded-full" />
                    ))}
                  </div>
                )}
                {count > 0 && (
                  <span className="text-xs text-gray-400 tabular-nums">{count}</span>
                )}
                <button
                  onClick={toggleLike}
                  disabled={!currentUserId}
                  className="p-1 rounded-full transition-colors disabled:cursor-default"
                  aria-label={liked ? t('community.unlike') : t('community.like')}
                >
                  {liked
                    ? <GradientHeartFill size={18} />
                    : <Heart size={18} weight="regular" className="text-gray-300 hover:text-primary active:opacity-50" />
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Comments section */}
          {commentsOpen && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              {r.reflection_comments.length === 0 && (
                <p className="text-xs text-gray-400">{t('community.noComments')}</p>
              )}
              {r.reflection_comments.map((c: ReflectionComment) => (
                <CommentItem
                  key={c.id}
                  reflectionId={r.id}
                  comment={c}
                  isOwn={c.user_id === currentUserId}
                  canDelete={currentUserIsAdmin || c.user_id === currentUserId}
                  onDelete={handleDeleteComment}
                  onSaved={() => router.refresh()}
                />
              ))}
              {currentUserId && (
                <div className="flex gap-2 pt-1">
                  <BibleAvatar seed={currentUserAvatarSeed ?? currentUserId} className="w-6 h-6 shrink-0 mt-1" />
                  <div className="flex-1 flex gap-2 min-w-0">
                    <input
                      type="text"
                      value={commentInput}
                      onChange={e => setCommentInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                      placeholder={t('community.commentPlaceholder')}
                      className="flex-1 min-w-0 bg-gray-100 rounded-xl px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={submitting || !commentInput.trim()}
                      className="shrink-0 text-xs font-medium text-primary disabled:opacity-40"
                    >
                      {t('community.submit')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function ReflectionFeed({ reflections, currentUserId, currentUserAvatarSeed, currentUserIsAdmin, scrollTo }: Props) {
  const router = useRouter()
  const { locale, t } = useI18n()
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!scrollTo) return
    const el = document.getElementById(`date-${scrollTo}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [scrollTo])

  function handleDelete(id: string) {
    setDeletedIds(prev => new Set([...prev, id]))
    router.refresh()
  }

  const visible = reflections.filter(r => !deletedIds.has(r.id))

  if (visible.length === 0) {
    return <div className="text-center py-10 text-sm text-gray-400">{t('community.feedEmpty')}</div>
  }

  const grouped = visible.reduce<Record<string, ReflectionWithProfile[]>>((acc, r) => {
    if (!acc[r.note_date]) acc[r.note_date] = []
    acc[r.note_date].push(r)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-6">
      {/* Gradient definition — referenced by GradientHeartFill via url(#rl-heart-grad) */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <linearGradient id="rl-heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFCC66" />
            <stop offset="100%" stopColor="#FF8C5A" />
          </linearGradient>
        </defs>
      </svg>
      {sortedDates.map(date => {
        const group = grouped[date]
        const bibleRange = group[0].bible_range
        return (
          <div key={date} id={`date-${date}`}>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-heading">{formatDate(date, locale)}</span>
                {bibleRange && (
                  <span className="text-xs text-primary-dark inline-flex items-center gap-1"><BookOpen size={13} weight="fill" /> {localizeBibleRange(bibleRange, locale)}</span>
                )}
              </div>
              <Link
                href={`/notes/${date}#reflection`}
                className="text-xs text-gray-400 hover:text-gray-600 active:opacity-50 shrink-0 ml-2"
              >
                {t('community.goToNote')}
              </Link>
            </div>
            <div className="space-y-3">
              {group.map(r => (
                <ReflectionCard
                  key={r.id}
                  r={r}
                  currentUserId={currentUserId}
                  currentUserAvatarSeed={currentUserAvatarSeed}
                  currentUserIsAdmin={currentUserIsAdmin}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
