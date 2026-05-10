import CheckinSection from '@/components/checkin/CheckinSection'
import { createClient, getUser } from '@/lib/supabase/server'
import { todayString } from '@/lib/utils'

export default async function CheckinPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  const today = todayString()
  const monthStart = `${today.slice(0, 7)}-01`

  const [{ data: profile }, { count: monthlyCount }] = await Promise.all([
    supabase
      .from('profiles')
      .select('streak_current, streak_max, total_points')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .eq('is_retro', false)
      .gte('note_date', monthStart)
      .lte('note_date', today),
  ])

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">每日簽到</h1>
      <CheckinSection
        streakCurrent={profile?.streak_current ?? 0}
        streakMax={profile?.streak_max ?? 0}
        totalPoints={profile?.total_points ?? 0}
        monthlyCount={Math.min(monthlyCount ?? 0, 10)}
      />
    </div>
  )
}
