'use client'
import { useState, useEffect } from 'react'
import { Heart } from '@phosphor-icons/react'
import { formatDateZH } from '@/lib/utils'
import type { ReflectionWithProfile } from '@/types/app'
import BibleAvatar from '@/components/avatar/BibleAvatar'

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
}

// sessionStorage helpers — key: `rl:<id>`, value: '1' | '0'
function ssGet(id: string): boolean | null {
  try { const v = sessionStorage.getItem(`rl:${id}`); return v !== null ? v === '1' : null } catch { return null }
}
function ssSet(id: string, liked: boolean) {
  try { sessionStorage.setItem(`rl:${id}`, liked ? '1' : '0') } catch {}
}

function ReflectionCard({
  r, currentUserId, currentUserAvatarSeed,
}: {
  r: ReflectionWithProfile
  currentUserId: string | null
  currentUserAvatarSeed: string | null
}) {
  const name = r.is_anonymous ? '匿名' : r.profiles?.display_name ?? '使用者'
  const seed = r.is_anonymous ? 'anon' : (r.profiles?.avatar_seed ?? r.user_id)

  const serverLiked = currentUserId ? r.reflection_likes.some(l => l.user_id === currentUserId) : false
  const serverCount = r.reflection_likes.length
  const serverSeeds = r.reflection_likes.slice(0, 3).map(l => l.profiles?.avatar_seed ?? l.user_id)

  const [liked, setLiked] = useState(serverLiked)
  const [count, setCount] = useState(serverCount)
  const [displaySeeds, setDisplaySeeds] = useState(serverSeeds)

  // Restore state from sessionStorage after mount (survives tab switching)
  useEffect(() => {
    const stored = ssGet(r.id)
    if (stored === null) return  // no user interaction yet — trust server
    if (stored === serverLiked) return  // server already matches
    // Server data is stale relative to user interaction — correct both liked and count
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

    // Update visible avatar stack
    if (next && currentUserAvatarSeed) {
      setDisplaySeeds(prev =>
        prev.includes(currentUserAvatarSeed) ? prev : [currentUserAvatarSeed, ...prev].slice(0, 3)
      )
    } else if (!next && currentUserAvatarSeed) {
      setDisplaySeeds(prev => prev.filter(s => s !== currentUserAvatarSeed))
    }

    await fetch(`/api/reflections/${r.id}/like`, { method: next ? 'POST' : 'DELETE' })
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <BibleAvatar seed={seed} className="w-7 h-7 shrink-0" />
        <span className="text-sm font-medium text-gray-900 truncate">{name}</span>
        <span className="text-xs text-gray-400 ml-auto shrink-0">{formatDateZH(r.note_date)}</span>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-700 leading-6 whitespace-pre-wrap mb-3">{r.content}</p>

      {/* Like row */}
      <div className="flex items-center justify-end gap-1.5">
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
          aria-label={liked ? '取消讚' : '讚'}
        >
          {liked
            ? <GradientHeartFill size={18} />
            : <Heart size={18} weight="regular" className="text-gray-300 hover:text-amber-400" />
          }
        </button>
      </div>
    </div>
  )
}

export default function ReflectionFeed({ reflections, currentUserId, currentUserAvatarSeed }: Props) {
  if (reflections.length === 0) {
    return <div className="text-center py-10 text-sm text-gray-400">還沒有人分享，來做第一個吧！</div>
  }
  return (
    <div className="space-y-3">
      {/* Gradient definition — referenced by GradientHeartFill via url(#rl-heart-grad) */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <linearGradient id="rl-heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFCC66" />
            <stop offset="100%" stopColor="#FF8C5A" />
          </linearGradient>
        </defs>
      </svg>
      {reflections.map(r => (
        <ReflectionCard
          key={r.id}
          r={r}
          currentUserId={currentUserId}
          currentUserAvatarSeed={currentUserAvatarSeed}
        />
      ))}
    </div>
  )
}
