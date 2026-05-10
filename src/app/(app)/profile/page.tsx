import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDateZH } from '@/lib/utils'
import type { BadgeWithStatus } from '@/types/app'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: badges }, { data: userBadges }, { data: checkins }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('badges').select('*').order('condition_value'),
    supabase.from('user_badges').select('*').eq('user_id', user.id),
    supabase.from('checkins').select('*').eq('user_id', user.id).order('note_date', { ascending: false }).limit(30),
  ])

  const badgesWithStatus: BadgeWithStatus[] = (badges ?? []).map(b => ({
    ...b,
    earned: (userBadges ?? []).some(ub => ub.badge_id === b.id),
    earned_at: (userBadges ?? []).find(ub => ub.badge_id === b.id)?.earned_at,
  }))

  const avatarUrl = `https://api.dicebear.com/9.x/thumbs/svg?seed=${profile?.avatar_seed}`

  async function handleSignOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1a1a1a]">個人</h1>
        <form action={handleSignOut}>
          <button type="submit" className="text-sm text-gray-400 hover:text-gray-600">登出</button>
        </form>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
        <img src={avatarUrl} alt="" className="w-14 h-14 rounded-full bg-gray-100" />
        <div>
          <p className="font-semibold text-[#1a1a1a]">{profile?.display_name}</p>
          <p className="text-xs text-gray-400">加入於 {formatDateZH((profile?.created_at ?? '').split('T')[0])}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: '總積分', value: profile?.total_points ?? 0, icon: '💎' },
          { label: '連續天數', value: `${profile?.streak_current ?? 0} 天`, icon: '🔥' },
          { label: '最長連續', value: `${profile?.streak_max ?? 0} 天`, icon: '⭐' },
          { label: '累計簽到', value: `${checkins?.length ?? 0} 次`, icon: '✅' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-lg font-bold text-[#1a1a1a]">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">徽章</h2>
        <div className="grid grid-cols-4 gap-3">
          {badgesWithStatus.map(b => (
            <div key={b.id} className={`flex flex-col items-center gap-1 ${!b.earned ? 'opacity-30' : ''}`}>
              <span className="text-3xl">{b.icon}</span>
              <span className="text-xs text-center text-gray-600 leading-tight">{b.name_zh}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Checkin history */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">簽到紀錄</h2>
        <div className="space-y-2">
          {(checkins ?? []).map(c => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <span className="text-[#1a1a1a]">{formatDateZH(c.note_date)}</span>
              <div className="flex items-center gap-2">
                {c.is_retro && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">補簽</span>}
                <span className="text-[#4a7c59] font-medium">+{c.points_earned}</span>
              </div>
            </div>
          ))}
          {!checkins?.length && <p className="text-sm text-gray-400 text-center py-4">還沒有簽到紀錄</p>}
        </div>
      </div>
    </div>
  )
}
