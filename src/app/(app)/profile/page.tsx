import { createClient, getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDateZH } from '@/lib/utils'
import type { BadgeWithStatus } from '@/types/app'
import BadgeGrid from '@/components/profile/BadgeGrid'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import { Gear, Diamond, Fire, Star, SealCheck } from '@phosphor-icons/react/dist/ssr'

export default async function ProfilePage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
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
        <h1 className="text-xl font-bold text-gray-900">個人</h1>
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-gray-400 hover:text-gray-600"><Gear size={22} /></Link>
          <form action={handleSignOut}>
            <button type="submit" className="text-sm text-gray-400 hover:text-gray-600">登出</button>
          </form>
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
        <BibleAvatar seed={profile?.avatar_seed ?? 'alpha'} className="w-14 h-14" />
        <div>
          <p className="font-semibold text-gray-900">{profile?.display_name}</p>
          <p className="text-xs text-gray-400">加入於 {formatDateZH((profile?.created_at ?? '').split('T')[0])}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: '總積分', value: profile?.total_points ?? 0, icon: <Diamond size={26} weight="fill" /> },
          { label: '連續天數', value: `${profile?.streak_current ?? 0} 天`, icon: <Fire size={26} weight="fill" /> },
          { label: '最長連續', value: `${profile?.streak_max ?? 0} 天`, icon: <Star size={26} weight="fill" /> },
          { label: '累計簽到', value: `${checkins?.length ?? 0} 次`, icon: <SealCheck size={26} weight="fill" /> },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <span className="text-gray-700">{s.icon}</span>
            <div>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">徽章</h2>
        <BadgeGrid badges={badgesWithStatus} />
      </div>

      {/* Checkin history */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">簽到紀錄</h2>
        <div className="space-y-2">
          {(checkins ?? []).map(c => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-900">{formatDateZH(c.note_date)}</span>
              <div className="flex items-center gap-2">
                {c.is_retro && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">補簽</span>}
                <span className="text-gray-800 font-medium">+{c.points_earned}</span>
              </div>
            </div>
          ))}
          {!checkins?.length && <p className="text-sm text-gray-400 text-center py-4">還沒有簽到紀錄</p>}
        </div>
      </div>
    </div>
  )
}
