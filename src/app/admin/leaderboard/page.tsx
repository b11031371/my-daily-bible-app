import { createClient } from '@/lib/supabase/server'
import { getPeriodLabel } from '@/lib/utils'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import RebuildButtons from './RebuildButtons'

export default async function AdminLeaderboardPage() {
  const supabase = await createClient()
  const monthLabel = getPeriodLabel('monthly')

  const { data: monthly } = await supabase
    .from('leaderboard_snapshots')
    .select('rank, points, checkin_count, profiles(display_name, avatar_seed)')
    .eq('period_type', 'monthly')
    .eq('period_label', monthLabel)
    .order('rank')
    .limit(20)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">排行榜管理</h1>

      <RebuildButtons />

      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-2">本月榜 · {monthLabel}</h2>
        <RankList rows={(monthly ?? []) as unknown as RankRow[]} />
      </div>
    </div>
  )
}

type RankRow = {
  rank: number
  points: number
  checkin_count: number
  profiles: { display_name: string; avatar_seed: string } | null
}

function RankList({ rows }: { rows: RankRow[] }) {
  if (!rows.length) return <p className="text-sm text-gray-400 text-center py-4 bg-white rounded-xl shadow-sm">尚無資料，請先更新榜單</p>
  return (
    <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-50">
      {rows.map(r => (
        <div key={r.rank} className="flex items-center gap-3 px-4 py-3">
          <span className={`w-6 text-center text-sm font-bold shrink-0 ${r.rank <= 3 ? 'text-amber-500' : 'text-gray-300'}`}>
            {r.rank}
          </span>
          <BibleAvatar seed={r.profiles?.avatar_seed ?? 'alpha'} className="w-8 h-8 shrink-0" />
          <span className="flex-1 text-sm font-medium text-gray-900 truncate">{r.profiles?.display_name ?? '—'}</span>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-gray-900">{r.points} 分</p>
            <p className="text-xs text-gray-400">{r.checkin_count} 次簽到</p>
          </div>
        </div>
      ))}
    </div>
  )
}
