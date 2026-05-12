import Link from 'next/link'
import { fetchAvailableDates, fetchPassageRange } from '@/lib/github/api'
import { formatDateZH, todayString, getLastSevenDays } from '@/lib/utils'
import { createClient, getUser } from '@/lib/supabase/server'
import QuickCheckinButton from '@/components/notes/QuickCheckinButton'
import { Fire, Users, ChatCircle, Medal } from '@phosphor-icons/react/dist/ssr'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import type { Profile } from '@/types/app'

export default async function NotesPage() {
  const today = todayString()
  const weekDates = getLastSevenDays()

  // Fire GitHub fetches immediately — run concurrently with auth + Supabase
  const passageRangePromise = fetchPassageRange(today)
  const availableDatesPromise = fetchAvailableDates()

  const [user, supabase] = await Promise.all([getUser(), createClient()])

  const [
    { data: todayCheckins, count: checkinCount },
    { count: reflectionCount },
    { data: allBadges },
    { data: userBadges },
    { data: weekCheckins },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from('checkins')
      .select('user_id', { count: 'exact' })
      .eq('note_date', today),
    supabase
      .from('reflections')
      .select('*', { count: 'exact', head: true })
      .eq('note_date', today),
    supabase.from('badges').select('id').eq('is_active', true),
    supabase.from('user_badges').select('badge_id').eq('user_id', user!.id),
    supabase.from('checkins').select('note_date').eq('user_id', user!.id).in('note_date', weekDates),
    supabase.from('profiles').select('streak_current').eq('id', user!.id).single(),
  ])

  const communityUserIds = (todayCheckins ?? []).slice(0, 4).map(c => c.user_id)

  // Run communityProfiles in parallel with GitHub resolution — avoids a 3rd serial wave
  const [passageRange, availableDates, { data: communityProfiles }] = await Promise.all([
    passageRangePromise,
    availableDatesPromise,
    communityUserIds.length > 0
      ? supabase.from('profiles').select('id, display_name, avatar_seed').in('id', communityUserIds)
      : Promise.resolve({ data: [] as Pick<Profile, 'id' | 'display_name' | 'avatar_seed'>[] }),
  ])

  const userCheckedIn = (todayCheckins ?? []).some(c => c.user_id === user!.id)
  const unearnedBadges = (allBadges?.length ?? 0) - (userBadges?.length ?? 0)
  const checkedDates = new Set((weekCheckins ?? []).map(c => c.note_date))
  const pastDates = availableDates.filter(d => d !== today).slice(0, 2)

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-2 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">每日筆記</h1>

      {/* Hero card */}
      <Link href={`/notes/${today}`} className="block active:opacity-90 transition-opacity">
        <div className="animated-border rounded-3xl shadow-lg">
          <div className="bg-gradient-to-br from-[#FFD880] to-[#FFB85A] rounded-[22px] p-6 text-gray-900">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-black/10 px-2.5 py-1 rounded-full font-medium">今日</span>
              <span className="text-sm text-gray-700">{formatDateZH(today)}</span>
            </div>
            <p className="text-xs text-gray-600 mb-1">今日讀經範圍</p>
            <p className="text-xl font-bold leading-snug mb-4">
              {passageRange ?? '今日筆記尚未上傳'}
            </p>
            <div className="flex items-center gap-1 text-sm text-gray-700 font-medium">
              <span>閱讀今日筆記</span>
              <span>›</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Streak + week progress */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Fire size={20} weight="fill" className="text-gray-700" />
            <span className="font-bold text-gray-900">{profile?.streak_current ?? 0} 天連續</span>
          </div>
          <span className="text-xs text-gray-400">最近 7 天</span>
        </div>
        <div className="flex gap-1.5">
          {weekDates.map(date => {
            const isToday = date === today
            const done = checkedDates.has(date)
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold
                  ${done ? 'bg-primary text-gray-900' : isToday ? 'border-2 border-primary text-gray-800' : 'bg-gray-100 text-gray-300'}`}>
                  {done ? '✓' : ''}
                </div>
                <span className="text-[10px] text-gray-400">{date.slice(8)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick checkin */}
      <QuickCheckinButton initialCheckedIn={userCheckedIn} />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Users size={22} weight="fill" />, value: checkinCount ?? 0, label: '今日簽到' },
          { icon: <ChatCircle size={22} weight="fill" />, value: reflectionCount ?? 0, label: '今日留言' },
          { icon: <Medal size={22} weight="fill" />, value: unearnedBadges, label: '待蒐集徽章' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
            <div className="flex justify-center mb-0.5 text-gray-700">{s.icon}</div>
            <div className="font-bold text-gray-900 text-base">{s.value}</div>
            <div className="text-[10px] text-gray-400 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Community preview */}
      {(checkinCount ?? 0) > 0 && (
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
          <div className="flex -space-x-2 shrink-0">
            {(communityProfiles ?? []).map((p) => (
              <BibleAvatar
                key={p.id}
                seed={p.avatar_seed ?? 'alpha'}
                className="w-8 h-8 border-2 border-white"
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 leading-snug">
            {(() => {
              const names = (communityProfiles ?? []).map(p => p.display_name).slice(0, 2).join('、')
              const total = checkinCount ?? 0
              if (total === 1) return `${names} 今天已簽到 🎉`
              if (total <= (communityProfiles?.length ?? 0)) return `${names} 今天已簽到`
              return `${names} 等 ${total} 人今天已簽到`
            })()}
          </p>
        </div>
      )}

      {/* Past notes */}
      {pastDates.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 mb-2 px-1">過去筆記</h2>
          <div className="space-y-2">
            {pastDates.map(date => (
              <Link
                key={date}
                href={`/notes/${date}`}
                className="flex items-center justify-between bg-white rounded-2xl px-5 py-3.5 shadow-sm"
              >
                <span className="text-sm text-gray-900">{formatDateZH(date)}</span>
                <span className="text-gray-300 text-lg">›</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
