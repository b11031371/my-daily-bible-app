import { createClient } from '@/lib/supabase/server'
import ReflectionFeed from '@/components/community/ReflectionFeed'
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable'
import { getPeriodLabel } from '@/lib/utils'
import type { ReflectionWithProfile, LeaderboardEntryWithProfile } from '@/types/app'

export default async function CommunityPage() {
  const supabase = await createClient()
  const periodLabel = getPeriodLabel('weekly')

  const [{ data: reflections }, { data: leaderboard }] = await Promise.all([
    supabase
      .from('reflections')
      .select('*, profiles(display_name, avatar_seed)')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('leaderboard_snapshots')
      .select('*, profiles(display_name, avatar_seed)')
      .eq('period_type', 'weekly')
      .eq('period_label', periodLabel)
      .order('rank', { ascending: true })
      .limit(10),
  ])

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
      <h1 className="text-xl font-bold text-[#1a1a1a]">社群</h1>

      {/* Leaderboard */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">本週排行榜</h2>
        <LeaderboardTable entries={(leaderboard ?? []) as unknown as LeaderboardEntryWithProfile[]} />
      </section>

      {/* Reflection feed */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">最新反思回答</h2>
        <ReflectionFeed reflections={(reflections ?? []) as unknown as ReflectionWithProfile[]} />
      </section>
    </div>
  )
}
