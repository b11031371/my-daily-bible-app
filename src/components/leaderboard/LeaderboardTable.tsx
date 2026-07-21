'use client'
import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import type { LeaderboardEntryWithProfile } from '@/types/app'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import { useI18n } from '@/components/i18n/I18nProvider'
import { Medal } from '@phosphor-icons/react'

interface Props {
  entries: LeaderboardEntryWithProfile[]
}

// 前三名獎牌用寫實的金/銀/銅，刻意不跟主題色——換成主題色就不再是「獎牌」了。
const MEDAL_COLOR = ['#D9A122', '#9AA0A6', '#B0764A']

export default function LeaderboardTable({ entries }: Props) {
  const { t } = useI18n()
  const supabase = createClient()
  const { data: me } = useSWR('me', async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id
  })

  if (entries.length === 0) {
    return <div className="bg-surface rounded-2xl p-6 text-center text-sm text-gray-400 shadow-sm">{t('leaderboard.empty')}</div>
  }

  return (
    <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
      {entries.map((entry, i) => {
        const isMe = entry.user_id === me
        const medalColor = i < 3 ? MEDAL_COLOR[i] : null
        return (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${isMe ? 'bg-primary-light' : ''}`}
          >
            <span className="w-6 flex justify-center text-sm font-bold text-gray-400">
              {medalColor
                ? <Medal size={20} weight="fill" style={{ color: medalColor }} />
                : entry.rank}
            </span>
            <BibleAvatar seed={entry.profiles?.avatar_seed ?? 'alpha'} className="w-8 h-8" />
            <span className={`flex-1 text-sm font-medium ${isMe ? 'text-gray-900 font-bold' : 'text-gray-900'}`}>
              {entry.profiles?.display_name ?? t('leaderboard.user')}{isMe && t('leaderboard.you')}
            </span>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{t('leaderboard.pointsValue', { points: entry.points })}</p>
              <p className="text-xs text-gray-400">{t('profile.timesValue', { count: entry.checkin_count })}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
