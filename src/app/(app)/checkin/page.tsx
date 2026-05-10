import CheckinSection from '@/components/checkin/CheckinSection'
import { createClient } from '@/lib/supabase/server'

export default async function CheckinPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_current, streak_max, total_points')
    .eq('id', user!.id)
    .single()

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-xl font-bold text-[#1a1a1a] mb-6">每日簽到</h1>
      <CheckinSection
        streakCurrent={profile?.streak_current ?? 0}
        streakMax={profile?.streak_max ?? 0}
        totalPoints={profile?.total_points ?? 0}
      />
    </div>
  )
}
