import { createClient } from '@/lib/supabase/server'
import { formatDateZH, todayString } from '@/lib/utils'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import { setApprovalMode, setQuizAiOpen, setQuizOpen } from './actions'
import SyncNoteMetaButton from './SyncNoteMetaButton'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const today = todayString()

  const [
    { count: checkinCount },
    { count: reflectionCount },
    { data: approvalSetting },
    { data: quizAiSetting },
    { data: quizOpenSetting },
    { data: recentCheckins },
    { count: noteMetaCount },
  ] = await Promise.all([
    supabase.from('checkins').select('*', { count: 'exact', head: true }).eq('note_date', today),
    supabase.from('reflections').select('*', { count: 'exact', head: true }).eq('note_date', today),
    (supabase as any).from('app_settings').select('value').eq('key', 'approval_mode').single(),
    (supabase as any).from('app_settings').select('value').eq('key', 'quiz_ai_open').maybeSingle(),
    (supabase as any).from('app_settings').select('value').eq('key', 'quiz_open').maybeSingle(),
    supabase
      .from('checkins')
      .select('note_date, is_retro, checked_in_at, profiles(display_name, avatar_seed)')
      .order('note_date', { ascending: false })
      .order('checked_in_at', { ascending: true })
      .limit(100),
    supabase.from('note_meta').select('*', { count: 'exact', head: true }).not('bible_range', 'is', null),
  ])

  const approvalMode = (approvalSetting as any)?.value === 'true'
  const quizAiOpen = (quizAiSetting as any)?.value === 'true'
  const quizOpen = (quizOpenSetting as any)?.value === 'true'

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

      {/* Quiz feature toggle */}
      <div className="bg-surface rounded-xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">開放搶答測驗</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {quizOpen ? '開啟中 · 所有登入用戶都能建立與主持測驗' : '關閉中 · 一般用戶點入口只會看到「敬請期待」，僅 admin 可用'}
          </p>
        </div>
        <form action={setQuizOpen.bind(null, !quizOpen)}>
          <button
            type="submit"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${quizOpen ? 'bg-primary' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform ${quizOpen ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </form>
      </div>

      {/* Quiz AI toggle */}
      <div className="bg-surface rounded-xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">開放一般用戶用 AI 出題</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {quizAiOpen ? '開啟中 · 所有登入用戶都能用 AI 產生測驗題目' : '關閉中 · 只有 admin 能用 AI 出題'}
          </p>
        </div>
        <form action={setQuizAiOpen.bind(null, !quizAiOpen)}>
          <button
            type="submit"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${quizAiOpen ? 'bg-primary' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform ${quizAiOpen ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </form>
      </div>

      {/* Note passage range sync */}
      <SyncNoteMetaButton syncedCount={noteMetaCount ?? 0} />

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
