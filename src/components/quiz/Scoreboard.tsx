'use client'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import type { QuizRoomPlayerView } from '@/types/app'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Scoreboard({
  players,
  highlightId,
  limit,
}: {
  players: QuizRoomPlayerView[]
  highlightId?: string | null
  limit?: number
}) {
  const shown = limit ? players.slice(0, limit) : players

  return (
    <ol className="space-y-2">
      {shown.map((p, i) => {
        const me = highlightId === p.id
        return (
          <li
            key={p.id}
            className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 ${
              me ? 'bg-primary-light ring-1 ring-primary' : 'bg-surface shadow-sm'
            }`}
          >
            <span className="w-6 text-center text-sm font-bold text-gray-400 tabular-nums">
              {MEDALS[i] ?? i + 1}
            </span>
            <BibleAvatar seed={p.avatar_seed} className="w-8 h-8" />
            <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-800">{p.nickname}</span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">{p.score}</span>
          </li>
        )
      })}
    </ol>
  )
}
