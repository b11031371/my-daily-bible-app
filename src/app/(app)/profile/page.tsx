import { createClient, getUser } from '@/lib/supabase/server'
import TitleDivider from '@/components/layout/TitleDivider'
import { getServerI18n } from '@/lib/i18n/server'
import { localize } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatMonth, todayString } from '@/lib/utils'
import type { BadgeWithStatus } from '@/types/app'
import BadgeGrid from '@/components/profile/BadgeGrid'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import { Gear, Diamond, Fire, Star, SealCheck } from '@phosphor-icons/react/dist/ssr'
import PushSubscribeButton from '@/components/PushSubscribeButton'

type PointEntry = { date: string; label: string; points: number; tag?: string }

export default async function ProfilePage() {
  const [user, supabase, { locale, t }] = await Promise.all([getUser(), createClient(), getServerI18n()])
  if (!user) redirect('/login')

  const today = todayString()
  const [y, m] = today.slice(0, 7).split('-').map(Number)
  const monthStart = `${today.slice(0, 7)}-01`
  const monthEnd = new Date(Date.UTC(y, m, 1)).toISOString().split('T')[0]
  const monthLabel = formatMonth(today, locale)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [{ data: profile }, { data: badges }, { data: userBadges }, { data: checkins }, { data: reflections }, { data: earnedBadges }, { count: totalCheckinCount }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('badges').select('*').order('condition_value'),
    supabase.from('user_badges').select('*').eq('user_id', user.id),
    supabase.from('checkins').select('note_date, is_retro, points_earned').eq('user_id', user.id).gte('note_date', monthStart).lt('note_date', monthEnd).order('note_date', { ascending: true }),
    sb.from('reflections').select('note_date, points_earned').eq('user_id', user.id).gt('points_earned', 0).gte('note_date', monthStart).lt('note_date', monthEnd).order('note_date', { ascending: true }),
    sb.from('user_badges').select('earned_at, badges(name_zh, name_i18n, points_bonus)').eq('user_id', user.id).gte('earned_at', monthStart).lt('earned_at', monthEnd).order('earned_at', { ascending: true }),
    supabase.from('checkins').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const earnedMap = new Map((userBadges ?? []).map((ub: { badge_id: string; earned_at: string }) => [ub.badge_id, ub.earned_at]))

  const pointEntries: PointEntry[] = [
    ...(checkins ?? []).map((c: { note_date: string; is_retro: boolean; points_earned: number }) => ({
      date: c.note_date,
      label: c.is_retro ? t('profile.labelRetro') : t('profile.labelDaily'),
      points: c.points_earned,
      tag: c.is_retro ? t('profile.labelRetro') : undefined,
    })),
    ...(reflections ?? []).map((r: { note_date: string; points_earned: number }) => ({
      date: r.note_date,
      label: t('profile.labelReflection'),
      points: r.points_earned,
    })),
    ...(earnedBadges ?? [])
      .filter((ub: { badges: { points_bonus: number } | null }) => (ub.badges?.points_bonus ?? 0) > 0)
      .map((ub: { earned_at: string; badges: { name_zh: string; name_i18n: Record<string, string> | null; points_bonus: number } }) => ({
        date: ub.earned_at.split('T')[0],
        label: t('profile.labelBadge', { name: localize(ub.badges.name_i18n, locale, ub.badges.name_zh) }),
        points: ub.badges.points_bonus,
        tag: t('profile.tagBadge'),
      })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const monthlyTotal = pointEntries.reduce((sum, e) => sum + e.points, 0)
  const badgesWithStatus: BadgeWithStatus[] = (badges ?? []).map(b => ({
    ...b,
    earned: earnedMap.has(b.id),
    earned_at: earnedMap.get(b.id),
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
        <h1 className="page-title font-bold text-heading">{t('nav.profile')}</h1>
        <div className="flex items-center gap-3">
          {profile?.role === 'admin' && (
            <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-full px-2.5 py-1">{t('profile.admin')}</Link>
          )}
          <Link href="/settings" className="text-gray-400 hover:text-gray-600"><Gear size={22} /></Link>
          <form action={handleSignOut}>
            <button type="submit" className="text-sm text-gray-400 hover:text-gray-600">{t('profile.signOut')}</button>
          </form>
        </div>
      </div>

      <TitleDivider />

      {/* Profile card */}
      <div className="bg-surface rounded-2xl p-5 shadow-sm flex items-center gap-4">
        <BibleAvatar seed={profile?.avatar_seed ?? 'alpha'} className="w-14 h-14" />
        <div>
          <p className="font-semibold text-gray-900">{profile?.display_name}</p>
          <p className="text-xs text-gray-400">{t('profile.joinedOn', { date: formatDate((profile?.created_at ?? today).split('T')[0], locale) })}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'points', label: t('profile.totalPoints'), value: profile?.total_points ?? 0, icon: <Diamond size={26} weight="fill" /> },
          { key: 'streak', label: t('profile.streakCurrent'), value: t('checkin.daysValue', { count: profile?.streak_current ?? 0 }), icon: <Fire size={26} weight="fill" /> },
          { key: 'streakMax', label: t('profile.streakMax'), value: t('checkin.daysValue', { count: profile?.streak_max ?? 0 }), icon: <Star size={26} weight="fill" /> },
          { key: 'checkins', label: t('profile.totalCheckins'), value: t('profile.timesValue', { count: totalCheckinCount ?? 0 }), icon: <SealCheck size={26} weight="fill" /> },
        ].map(s => (
          <div key={s.key} className="bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <span className="text-heading">{s.icon}</span>
            <div>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Notification settings */}
      <div className="bg-surface rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-heading mb-4">{t('profile.notifications')}</h2>
        <PushSubscribeButton initialHour={(profile as any)?.notification_hour ?? 8} />
      </div>

      {/* Badges */}
      <div className="bg-surface rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-heading mb-4">{t('profile.badges')}</h2>
        <BadgeGrid badges={badgesWithStatus} />
      </div>

      {/* Point history */}
      <div className="bg-surface rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-heading">{t('profile.pointHistory', { month: monthLabel })}</h2>
          <span className="text-xs text-gray-400">{t('profile.totalEarned', { points: monthlyTotal })}</span>
        </div>
        <div className="space-y-2.5">
          {pointEntries.map((e, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-900 shrink-0">{formatDate(e.date, locale)}</span>
                {e.tag && (
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">{e.tag}</span>
                )}
                <span className="text-gray-500 text-xs truncate">{e.label}</span>
              </div>
              <span className="text-gray-800 font-medium shrink-0 ml-2">+{e.points}</span>
            </div>
          ))}
          {pointEntries.length === 0 && <p className="text-sm text-gray-400 text-center py-4">{t('profile.noHistory')}</p>}
        </div>
      </div>
    </div>
  )
}
