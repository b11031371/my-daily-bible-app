import CheckinSection from '@/components/checkin/CheckinSection'
import { createClient, getUser } from '@/lib/supabase/server'
import { getServerI18n } from '@/lib/i18n/server'
import { todayString } from '@/lib/utils'

export default async function CheckinPage() {
  const [user, supabase, { t }] = await Promise.all([getUser(), createClient(), getServerI18n()])
  const today = todayString()
  const monthStart = `${today.slice(0, 7)}-01`
  const [y, m] = today.slice(0, 7).split('-').map(Number)
  const monthEnd = new Date(Date.UTC(y, m, 1)).toISOString().split('T')[0]

  const pastDays = [1, 2, 3].map(n => {
    const [ty, tm, td] = today.split('-').map(Number)
    return new Date(Date.UTC(ty, tm - 1, td - n)).toISOString().split('T')[0]
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [
    { count: monthlyCount },
    { data: checkinRecords },
    { data: monthCheckins },
    { data: monthReflections },
    { data: monthBadges },
  ] = await Promise.all([
    supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .eq('is_retro', false)
      .gte('note_date', monthStart)
      .lt('note_date', monthEnd),
    supabase
      .from('checkins')
      .select('note_date, points_earned')
      .eq('user_id', user!.id)
      .in('note_date', [today, ...pastDays]),
    supabase
      .from('checkins')
      .select('note_date, points_earned')
      .eq('user_id', user!.id)
      .gte('note_date', monthStart)
      .lt('note_date', monthEnd),
    sb.from('reflections')
      .select('points_earned')
      .eq('user_id', user!.id)
      .gt('points_earned', 0)
      .gte('note_date', monthStart)
      .lt('note_date', monthEnd),
    sb.from('user_badges')
      .select('badges(points_bonus)')
      .eq('user_id', user!.id)
      .gte('earned_at', monthStart)
      .lt('earned_at', monthEnd),
  ])

  const monthlyPoints =
    (monthCheckins ?? []).reduce((s: number, c: { points_earned: number }) => s + c.points_earned, 0) +
    (monthReflections ?? []).reduce((s: number, r: { points_earned: number }) => s + r.points_earned, 0) +
    (monthBadges ?? []).reduce((s: number, ub: { badges: { points_bonus: number } | null }) => s + (ub.badges?.points_bonus ?? 0), 0)

  const checkinDates = [...new Set((monthCheckins ?? []).map((c: { note_date: string }) => c.note_date))].sort() as string[]
  const monthlyCheckinDays = checkinDates.length
  const monthlyMaxStreak = (() => {
    if (!checkinDates.length) return 0
    let max = 1, run = 1
    for (let i = 1; i < checkinDates.length; i++) {
      const diff = (new Date(checkinDates[i]).getTime() - new Date(checkinDates[i - 1]).getTime()) / 86400000
      run = diff === 1 ? run + 1 : 1
      if (run > max) max = run
    }
    return max
  })()

  const initialCheckins = Object.fromEntries(
    (checkinRecords ?? []).map(c => [c.note_date, c.points_earned])
  )

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">{t('checkin.pageTitle')}</h1>
      <CheckinSection
        monthlyCheckinDays={monthlyCheckinDays}
        monthlyMaxStreak={monthlyMaxStreak}
        monthlyPoints={monthlyPoints}
        monthlyCount={Math.min(monthlyCount ?? 0, 10)}
        initialCheckins={initialCheckins}
      />
    </div>
  )
}
