'use client'
import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import type { LeaderboardEntryWithProfile } from '@/types/app'
import BibleAvatar from '@/components/avatar/BibleAvatar'

interface Props {
  entries: LeaderboardEntryWithProfile[]
}

export default function LeaderboardTable({ entries }: Props) {
  const supabase = createClient()
  const { data: me } = useSWR('me', async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id
  })

  if (entries.length === 0) {
    return <div className="bg-white rounded-2xl p-6 text-center text-sm text-gray-400 shadow-sm">本週排行榜尚未產生</div>
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {entries.map((entry, i) => {
        const isMe = entry.user_id === me
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
        return (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${isMe ? 'bg-primary-light' : ''}`}
          >
            <span className="w-6 text-center text-sm font-bold text-gray-400">
              {medal ?? entry.rank}
            </span>
            <BibleAvatar seed={entry.profiles?.avatar_seed ?? 'alpha'} className="w-8 h-8" />
            <span className={`flex-1 text-sm font-medium ${isMe ? 'text-gray-900 font-bold' : 'text-gray-900'}`}>
              {entry.profiles?.display_name ?? '使用者'}{isMe && ' (你)'}
            </span>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{entry.points} 分</p>
              <p className="text-xs text-gray-400">{entry.checkin_count} 次</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
