import { createClient } from '@/lib/supabase/server'
import { formatDateZH, todayString } from '@/lib/utils'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import { setApprovalMode } from './actions'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const today = todayString()

  const [
    { count: checkinCount },
    { count: reflectionCount },
    { data: approvalSetting },
    { data: recentCheckins },
  ] = await Promise.all([
    supabase.from('checkins').select('*', { count: 'exact', head: true }).eq('note_date', today),
    supabase.from('reflections').select('*', { count: 'exact', head: true }).eq('note_date', today),
    (supabase as any).from('app_settings').select('value').eq('key', 'approval_mode').single(),
    supabase
      .from('checkins')
      .select('note_date, is_retro, checked_in_at, profiles(display_name, avatar_seed)')
      .order('note_date', { ascending: false })
      .order('checked_in_at', { ascending: true })
      .limit(100),
  ])

  const approvalMode = (approvalSetting as any)?.value === 'true'

  // Group checkins by date
  type CheckinRow = { note_date: string; is_retro: boolean; profiles: { display_name: string; avatar_seed: string } | null }
  const grouped = new Map<string, CheckinRow[]>()
  for (const c of (recentCheckins ?? []) as unknown as CheckinRow[]) {
    const existing = grouped.get(c.note_date) ?? []
    existing.push(c)
    grouped.set(c.note_date, existing)
  }
  const dates = [...grouped.keys()].slice(0, 14)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">後台首頁</h1>

      {/* Approval mode toggle */}
      <div className="bg-surface rounded-xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">筆記審核模式</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {approvalMode ? '開啟中 · 新筆記需審核後才對外公開' : '關閉中 · 所有筆記直接對外公開'}
          </p>
        </div>
        <form action={setApprovalMode.bind(null, !approvalMode)}>
          <button
            type="submit"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${approvalMode ? 'bg-primary' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform ${approvalMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </form>
      </div>

      {/* Today stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface rounded-xl p-5 shadow-sm">
          <p className="text-3xl font-bold text-gray-900">{checkinCount ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">今日簽到人數</p>
        </div>
        <div className="bg-surface rounded-xl p-5 shadow-sm">
          <p className="text-3xl font-bold text-accent">{reflectionCount ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">今日反思回答</p>
        </div>
      </div>

      {/* Daily checkin log */}
      <div className="bg-surface rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">每日簽到紀錄</h2>
        <div className="space-y-4">
          {dates.map(date => {
            const entries = grouped.get(date)!
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">{formatDateZH(date)}</span>
                  <span className="text-xs text-gray-400">{entries.length} 人</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entries.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-full pl-1 pr-2.5 py-1">
                      <BibleAvatar seed={c.profiles?.avatar_seed ?? 'alpha'} className="w-5 h-5" />
                      <span className="text-xs text-gray-700">{c.profiles?.display_name ?? '—'}</span>
                      {c.is_retro && <span className="text-[10px] text-gray-400">補</span>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {dates.length === 0 && <p className="text-sm text-gray-400 text-center py-4">尚無簽到紀錄</p>}
        </div>
      </div>
    </div>
  )
}
