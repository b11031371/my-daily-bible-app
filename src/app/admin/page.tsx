import { createClient } from '@/lib/supabase/server'
import { formatDateZH, todayString } from '@/lib/utils'
import { setApprovalMode } from './actions'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const today = todayString()

  const [{ count: checkinCount }, { count: reflectionCount }, { data: recentReflections }, { data: approvalSetting }] = await Promise.all([
    supabase.from('checkins').select('*', { count: 'exact', head: true }).eq('note_date', today),
    supabase.from('reflections').select('*', { count: 'exact', head: true }).eq('note_date', today),
    supabase.from('reflections').select('*, profiles(display_name)').order('created_at', { ascending: false }).limit(10),
    (supabase as any).from('app_settings').select('value').eq('key', 'approval_mode').single(),
  ])

  const approvalMode = (approvalSetting as any)?.value === 'true'

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">後台首頁</h1>

      {/* Approval mode toggle */}
      <div className="bg-white rounded-xl p-5 shadow-sm flex items-center justify-between">
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
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${approvalMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-3xl font-bold text-gray-900">{checkinCount ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">今日簽到人數</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-3xl font-bold text-accent">{reflectionCount ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">今日反思回答</p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">最新留言</h2>
        <div className="space-y-3">
          {((recentReflections ?? []) as any[]).map((r: any) => (
            <div key={r.id} className="text-sm border-b border-gray-50 pb-3 last:border-0">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{r.is_anonymous ? '匿名' : r.profiles?.display_name}</span>
                <span>{formatDateZH(r.note_date)}</span>
              </div>
              <p className="text-gray-700 line-clamp-2">{r.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
